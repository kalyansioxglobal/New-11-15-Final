import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import sgMail from "@sendgrid/mail";
import { requireUser } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { getOrCreateDefaultLocation } from "@/lib/logistics/customerLocation";
import { findDuplicateCustomers, isStrongMatch } from "@/lib/freight/customerDedupe";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const APPROVAL_TO = (process.env.LOGISTICS_CUSTOMER_APPROVAL_TO || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const APPROVAL_CC_DEFAULT = (process.env.LOGISTICS_CUSTOMER_APPROVAL_CC || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

type ChecklistItemStatus = "PENDING" | "AUTO_PASS" | "AUTO_WARN" | "AUTO_FAIL" | "DONE_MANUAL";

type ChecklistItem = {
  key: string;
  label: string;
  type: "AUTO" | "MANUAL";
  status: ChecklistItemStatus;
  auto?: boolean;
  notes?: string | null;
  updatedAt?: string | null;
};

type AutoChecks = {
  phoneCheck?: {
    ok: boolean;
    lineType?: string | null;
    carrier?: string | null;
    error?: string | null;
  };
  domainCheck?: {
    ok: boolean;
    domain?: string | null;
    createdDate?: string | null;
    ageDays?: number | null;
    error?: string | null;
  };
  placesCheck?: {
    ok: boolean;
    name?: string | null;
    formattedAddress?: string | null;
    rating?: number | null;
    userRatingsTotal?: number | null;
    error?: string | null;
  };
  fmcsaCheck?: {
    ok: boolean;
    usdot?: string | null;
    legalName?: string | null;
    dbaName?: string | null;
    status?: string | null;
    oos?: boolean | null;
    error?: string | null;
  };
};

function nowIso() {
  return new Date().toISOString();
}

async function runPhoneCheck(phoneRaw?: string | null): Promise<AutoChecks["phoneCheck"]> {
  if (!phoneRaw) {
    return { ok: false, error: "No phone provided" };
  }
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return { ok: false, error: "Twilio credentials not configured" };
  }

  try {
    const phone = encodeURIComponent(phoneRaw);
    const url = `https://lookups.twilio.com/v1/PhoneNumbers/${phone}?Type=carrier`;

    const authToken = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${authToken}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Twilio lookup error: ${res.status} ${text}` };
    }

    const json: any = await res.json();
    const carrier = json.carrier || {};
    const lineType = carrier.type || null;
    const carrierName = carrier.name || null;

    const ok = !!lineType;
    return {
      ok,
      lineType,
      carrier: carrierName,
      error: ok ? null : "No carrier data returned",
    };
  } catch (err: any) {
    return { ok: false, error: `Twilio lookup exception: ${err?.message || String(err)}` };
  }
}

function extractDomain(urlOrEmail?: string | null): string | null {
  if (!urlOrEmail) return null;
  let value = urlOrEmail.trim();

  if (value.includes("@")) {
    const parts = value.split("@");
    value = parts[1] || value;
  }

  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    value = "https://" + value;
  }

  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

async function runDomainCheck(website?: string | null, email?: string | null): Promise<AutoChecks["domainCheck"]> {
  const domain = extractDomain(website || email);
  if (!domain) {
    return { ok: false, domain: null, error: "No valid domain from website or email" };
  }
  if (!process.env.WHOISXML_API_KEY) {
    return { ok: false, domain, error: "WHOISXML_API_KEY not configured" };
  }

  try {
    const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${encodeURIComponent(
      process.env.WHOISXML_API_KEY
    )}&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, domain, error: `WhoisXML HTTP ${res.status} ${text}` };
    }

    const json: any = await res.json();
    const registryData = json.WhoisRecord?.registryData || json.WhoisRecord || {};
    const createdDate = registryData.createdDate || registryData.createdDateNormalized || null;

    let ageDays: number | null = null;
    if (createdDate) {
      const created = new Date(createdDate);
      if (!isNaN(created.getTime())) {
        const diffMs = Date.now() - created.getTime();
        ageDays = Math.floor(diffMs / 1000 / 60 / 60 / 24);
      }
    }

    const ok = ageDays === null ? true : ageDays >= 30;
    return {
      ok,
      domain,
      createdDate,
      ageDays,
      error: ok ? null : "Domain very new / low age",
    };
  } catch (err: any) {
    return {
      ok: false,
      domain,
      createdDate: null,
      ageDays: null,
      error: `WhoisXML exception: ${err?.message || String(err)}`,
    };
  }
}

async function runPlacesCheck(
  name?: string | null,
  addressParts?: { city?: string | null; state?: string | null }
): Promise<AutoChecks["placesCheck"]> {
  if (!name) return { ok: false, error: "No name provided" };
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return { ok: false, error: "GOOGLE_PLACES_API_KEY not configured" };
  }

  try {
    const query = [name, addressParts?.city, addressParts?.state].filter(Boolean).join(" ");
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      query
    )}&inputtype=textquery&fields=place_id,name,formatted_address,rating,user_ratings_total&key=${encodeURIComponent(
      process.env.GOOGLE_PLACES_API_KEY
    )}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Google Places HTTP ${res.status} ${text}` };
    }

    const json: any = await res.json();
    if (json.status !== "OK" || !json.candidates || !json.candidates.length) {
      return { ok: false, error: `Places status: ${json.status || "NO_RESULTS"}` };
    }

    const candidate = json.candidates[0];
    return {
      ok: true,
      name: candidate.name || null,
      formattedAddress: candidate.formatted_address || null,
      rating: candidate.rating ?? null,
      userRatingsTotal: candidate.user_ratings_total ?? null,
      error: null,
    };
  } catch (err: any) {
    return { ok: false, error: `Google Places exception: ${err?.message || String(err)}` };
  }
}

async function runFmcsaCheckApi(usdot: string): Promise<AutoChecks["fmcsaCheck"]> {
  try {
    const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${encodeURIComponent(
      usdot
    )}?webKey=${encodeURIComponent(process.env.FMCSA_WEBKEY!)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, usdot, error: `FMCSA API HTTP ${res.status} ${text}` };
    }

    const json: any = await res.json();
    const content = json.content?.[0] || {};
    const legalName = content.legalName || null;
    const dbaName = content.dbaName || null;
    const status = content.operatingStatus || null;
    const oos = !!content.oosFlag;

    const ok = !oos && !!legalName;
    return {
      ok,
      usdot,
      legalName,
      dbaName,
      status,
      oos,
      error: ok ? null : "FMCSA indicates OOS or missing data",
    };
  } catch (err: any) {
    return {
      ok: false,
      usdot,
      error: `FMCSA API exception: ${err?.message || String(err)}`,
    };
  }
}

async function runFmcsaCheckSafer(usdot: string): Promise<AutoChecks["fmcsaCheck"]> {
  try {
    const url = `https://safer.fmcsa.dot.gov/query.asp?query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${encodeURIComponent(usdot)}`;

    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, usdot, error: `SAFER HTTP ${res.status}` };
    }

    const html = await res.text();

    const legalNameMatch = html.match(/Legal Name:<\/th>\s*<td[^>]*>([^<]+)</i);
    const dbaMatch = html.match(/DBA Name:<\/th>\s*<td[^>]*>([^<]+)</i);
    const statusMatch = html.match(/Operating Status:<\/th>\s*<td[^>]*>([^<]+)</i);
    const oosMatch = html.match(/Out of Service Date:<\/th>\s*<td[^>]*>([^<]+)</i);

    const legalName = legalNameMatch?.[1]?.trim() || null;
    const dbaName = dbaMatch?.[1]?.trim() || null;
    const status = statusMatch?.[1]?.trim() || null;
    const oosDateStr = oosMatch?.[1]?.trim();
    const oos = !!(oosDateStr && oosDateStr.toLowerCase() !== "none" && oosDateStr !== "--");

    const ok = !oos && !!legalName && status?.toUpperCase() === "AUTHORIZED";
    return {
      ok,
      usdot,
      legalName,
      dbaName,
      status,
      oos,
      error: ok ? null : oos ? "Carrier is Out of Service" : status ? `Status: ${status}` : "Could not parse SAFER page",
    };
  } catch (err: any) {
    return {
      ok: false,
      usdot,
      error: `SAFER scrape exception: ${err?.message || String(err)}`,
    };
  }
}

async function runFmcsaCheck(
  usdot?: string | null
): Promise<AutoChecks["fmcsaCheck"]> {
  if (!usdot) {
    return { ok: false, usdot: null, error: "USDOT not provided" };
  }

  if (process.env.FMCSA_WEBKEY) {
    return runFmcsaCheckApi(usdot);
  }

  return runFmcsaCheckSafer(usdot);
}

function buildChecklist(autoChecks: AutoChecks): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  items.push({
    key: "phone_verification",
    label: "Phone verification (Twilio Lookup)",
    type: "AUTO",
    auto: true,
    status: autoChecks.phoneCheck?.ok ? "AUTO_PASS" : "AUTO_WARN",
    notes: autoChecks.phoneCheck
      ? `Line type: ${autoChecks.phoneCheck.lineType || "n/a"}, carrier: ${
          autoChecks.phoneCheck.carrier || "n/a"
        }${autoChecks.phoneCheck.error ? `; note: ${autoChecks.phoneCheck.error}` : ""}`
      : "Not run",
    updatedAt: nowIso(),
  });

  items.push({
    key: "domain_check",
    label: "Domain & website check (WHOIS age)",
    type: "AUTO",
    auto: true,
    status: autoChecks.domainCheck?.ok ? "AUTO_PASS" : "AUTO_WARN",
    notes: autoChecks.domainCheck
      ? `Domain: ${autoChecks.domainCheck.domain || "n/a"}, created: ${
          autoChecks.domainCheck.createdDate || "n/a"
        }, ageDays: ${autoChecks.domainCheck.ageDays ?? "n/a"}${
          autoChecks.domainCheck.error ? `; note: ${autoChecks.domainCheck.error}` : ""
        }`
      : "Not run",
    updatedAt: nowIso(),
  });

  items.push({
    key: "online_reputation",
    label: "Online reputation (Google rating & reviews)",
    type: "AUTO",
    auto: true,
    status: autoChecks.placesCheck?.ok ? "AUTO_PASS" : "AUTO_WARN",
    notes: autoChecks.placesCheck
      ? `Name: ${autoChecks.placesCheck.name || "n/a"}, address: ${
          autoChecks.placesCheck.formattedAddress || "n/a"
        }, rating: ${autoChecks.placesCheck.rating ?? "n/a"} / 5, reviews: ${
          autoChecks.placesCheck.userRatingsTotal ?? "n/a"
        }${autoChecks.placesCheck.error ? `; note: ${autoChecks.placesCheck.error}` : ""}`
      : "Not run",
    updatedAt: nowIso(),
  });

  items.push({
    key: "mc_dot_check",
    label: "MC/DOT lookup (FMCSA) – if applicable",
    type: "AUTO",
    auto: true,
    status: autoChecks.fmcsaCheck?.ok ? "AUTO_PASS" : "AUTO_WARN",
    notes: autoChecks.fmcsaCheck
      ? `USDOT: ${autoChecks.fmcsaCheck.usdot || "n/a"}, legal: ${
          autoChecks.fmcsaCheck.legalName || "n/a"
        }, DBA: ${autoChecks.fmcsaCheck.dbaName || "n/a"}, status: ${
          autoChecks.fmcsaCheck.status || "n/a"
        }, OOS: ${autoChecks.fmcsaCheck.oos ? "YES" : "NO"}${
          autoChecks.fmcsaCheck.error ? `; note: ${autoChecks.fmcsaCheck.error}` : ""
        }`
      : "Not run",
    updatedAt: nowIso(),
  });

  items.push({
    key: "credit_review",
    label: "Manual credit review (CreditSafe / Ansonia / internal)",
    type: "MANUAL",
    auto: false,
    status: "PENDING",
    notes: null,
    updatedAt: null,
  });

  items.push({
    key: "agreement_executed",
    label: "Broker–Client Agreement signed",
    type: "MANUAL",
    auto: false,
    status: "PENDING",
    notes: null,
    updatedAt: null,
  });

  items.push({
    key: "systems_setup",
    label: "Customer set up in TMS & accounting",
    type: "MANUAL",
    auto: false,
    status: "PENDING",
    notes: null,
    updatedAt: null,
  });

  return items;
}

async function sendApprovalEmail(
  data: {
    id: number;
    customerLegalName: string;
    customerCode?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    website?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    paymentTermsRequested?: string | null;
    creditLimitRequested?: number | null;
    referenceNotes?: string | null;
  },
  autoChecks: AutoChecks,
  requestedBy?: { name?: string | null; email?: string | null }
) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set; skipping approval email send.");
    return;
  }
  if (!APPROVAL_TO.length) {
    console.warn("LOGISTICS_CUSTOMER_APPROVAL_TO not configured; no recipients.");
    return;
  }

  const subject = `Logistics Customer Approval – ${data.customerLegalName}${
    data.customerCode ? ` (${data.customerCode})` : ""
  }`;

  const checklistItems = buildChecklist(autoChecks);

  const autoSummaryHtml = `
    <ul>
      <li><strong>Phone:</strong> ${
        autoChecks.phoneCheck
          ? `${autoChecks.phoneCheck.ok ? "OK" : "Check"} – ${autoChecks.phoneCheck.lineType || "n/a"} / ${
              autoChecks.phoneCheck.carrier || "n/a"
            }`
          : "Not run"
      }</li>
      <li><strong>Domain:</strong> ${
        autoChecks.domainCheck
          ? `${autoChecks.domainCheck.domain || "n/a"} – age ${
              autoChecks.domainCheck.ageDays ?? "n/a"
            } days`
          : "Not run"
      }</li>
      <li><strong>Google Reviews:</strong> ${
        autoChecks.placesCheck
          ? `${autoChecks.placesCheck.rating ?? "n/a"} / 5 (${autoChecks.placesCheck.userRatingsTotal ?? "n/a"} reviews)`
          : "Not run"
      }</li>
      <li><strong>FMCSA (if applicable):</strong> ${
        autoChecks.fmcsaCheck
          ? `USDOT: ${autoChecks.fmcsaCheck.usdot || "n/a"}, status: ${
              autoChecks.fmcsaCheck.status || "n/a"
            }, OOS: ${autoChecks.fmcsaCheck.oos ? "YES" : "NO"}`
          : "Not run"
      }</li>
    </ul>
  `;

  const checklistHtml = `
    <ol>
      ${checklistItems
        .map(
          (item) =>
            `<li><strong>${item.label}</strong> – ${
              item.type === "AUTO" ? "Auto-check" : "Manual"
            } – status: ${item.status}${item.notes ? `<br/><em>${item.notes}</em>` : ""}</li>`
        )
        .join("")}
    </ol>
  `;

  const html = `
    <p>Hello Logistics Team,</p>
    <p>A new logistics customer approval request has been submitted from Command Center.</p>
    <h3>Customer Details</h3>
    <ul>
      <li><strong>Legal Name:</strong> ${data.customerLegalName}</li>
      ${data.customerCode ? `<li><strong>Customer Code:</strong> ${data.customerCode}</li>` : ""}
      <li><strong>Location:</strong> ${[data.city, data.state, data.country].filter(Boolean).join(", ")}</li>
      ${data.website ? `<li><strong>Website:</strong> ${data.website}</li>` : ""}
    </ul>
    <h3>Contact</h3>
    <ul>
      ${data.contactName ? `<li><strong>Contact Name:</strong> ${data.contactName}</li>` : ""}
      ${data.contactPhone ? `<li><strong>Phone:</strong> ${data.contactPhone}</li>` : ""}
      ${data.contactEmail ? `<li><strong>Email:</strong> ${data.contactEmail}</li>` : ""}
    </ul>
    <h3>Commercial Terms</h3>
    <ul>
      ${
        data.paymentTermsRequested
          ? `<li><strong>Payment Terms Requested:</strong> ${data.paymentTermsRequested}</li>`
          : ""
      }
      ${
        typeof data.creditLimitRequested === "number"
          ? `<li><strong>Credit Limit Requested:</strong> $${data.creditLimitRequested.toLocaleString()}</li>`
          : ""
      }
    </ul>
    ${
      data.referenceNotes
        ? `<h3>Reference / Notes</h3><p>${data.referenceNotes.replace(/\n/g, "<br/>")}</p>`
        : ""
    }
    <h3>Auto Checks Summary</h3>
    ${autoSummaryHtml}
    <h3>Onboarding Checklist</h3>
    ${checklistHtml}
    ${
      requestedBy?.name || requestedBy?.email
        ? `<p><em>Requested by: ${[requestedBy?.name, requestedBy?.email]
            .filter(Boolean)
            .join(" – ")}</em></p>`
        : ""
    }
    <p>You can review and finalize this request in Command Center.</p>
  `;

  const toSet = new Set(APPROVAL_TO.map((e) => e.toLowerCase()));
  const ccList = [
    ...APPROVAL_CC_DEFAULT,
    requestedBy?.email || "",
  ]
    .map((e) => e.trim())
    .filter(Boolean)
    .filter((e) => !toSet.has(e.toLowerCase()));

  try {
    await sgMail.send({
      from: process.env.LOGISTICS_CUSTOMER_APPROVAL_FROM || process.env.SENDGRID_FROM_EMAIL || "noreply@example.com",
      to: APPROVAL_TO,
      cc: ccList.length ? ccList : undefined,
      subject,
      html,
    });
    if (process.env.NODE_ENV === "development") {
      console.log("Approval email sent successfully to:", APPROVAL_TO.join(", "));
    }
  } catch (emailError: any) {
    console.error("SendGrid email error:", emailError?.response?.body || emailError?.message || emailError);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (!(await rateLimit(req, res, "customer-approval"))) {
      return;
    }

    if (req.method === "POST") {
      const {
        customerLegalName,
        dbaName,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        contactName,
        contactPhone,
        contactEmail,
        website,
        customerCode,
        usdotNumber,
        mcNumber,
        referenceNotes,
        paymentTermsRequested,
        creditLimitRequested,
        requestedByName,
        requestedByEmail,
      } = req.body;

      if (!customerLegalName || !addressLine1) {
        return res
          .status(400)
          .json({ error: "customerLegalName and addressLine1 are required." });
      }

      const approval = await prisma.customerApprovalRequest.create({
        data: {
          businessUnit: "LOGISTICS",
          customerLegalName,
          dbaName,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country: country || "USA",
          contactName,
          contactPhone,
          contactEmail,
          website,
          customerCode,
          usdotNumber,
          mcNumber,
          referenceNotes,
          paymentTermsRequested,
          creditLimitRequested: creditLimitRequested ? Number(creditLimitRequested) : null,
          requestedByUserId: user.id,
        },
      });

      const autoChecks: AutoChecks = {};

      autoChecks.phoneCheck = await runPhoneCheck(contactPhone);
      autoChecks.domainCheck = await runDomainCheck(website, contactEmail);
      autoChecks.placesCheck = await runPlacesCheck(customerLegalName, { city, state });
      autoChecks.fmcsaCheck = await runFmcsaCheck(usdotNumber);

      const checklist = buildChecklist(autoChecks);

      const updated = await prisma.customerApprovalRequest.update({
        where: { id: approval.id },
        data: {
          autoChecks,
          checklist,
        },
      });

      await sendApprovalEmail(
        {
          id: updated.id,
          customerLegalName: updated.customerLegalName,
          customerCode: updated.customerCode,
          city: updated.city,
          state: updated.state,
          country: updated.country,
          website: updated.website,
          contactName: updated.contactName,
          contactPhone: updated.contactPhone,
          contactEmail: updated.contactEmail,
          paymentTermsRequested: updated.paymentTermsRequested,
          creditLimitRequested: updated.creditLimitRequested
            ? Number(updated.creditLimitRequested)
            : null,
          referenceNotes: updated.referenceNotes,
        },
        autoChecks,
        { name: requestedByName, email: requestedByEmail }
      );

      return res.status(201).json({ ok: true, approval: updated });
    }

    if (req.method === "GET") {
      const approvals = await prisma.customerApprovalRequest.findMany({
        where: { businessUnit: "LOGISTICS" },
        include: {
          venture: { select: { id: true, name: true } },
          shipper: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return res.status(200).json({ approvals });
    }

    if (req.method === "PATCH") {
      const { id, status, decisionNotes, ventureId } = req.body;

      if (!id) {
        return res.status(400).json({ error: "id is required" });
      }

      const existing = await prisma.customerApprovalRequest.findUnique({
        where: { id: Number(id) },
      });

      if (!existing) {
        return res.status(404).json({ error: "Approval request not found" });
      }

      const updateData: any = {
        decisionNotes,
        decidedAt: new Date(),
        decidedByUserId: user.id,
      };

      if (status) {
        const allowedStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;

        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
        }

        if (existing.status !== "PENDING") {
          return res
            .status(400)
            .json({ error: "This approval request has already been decided." });
        }

        if (status === "PENDING") {
          return res
            .status(400)
            .json({ error: "Cannot change status back to PENDING once decided." });
        }

        updateData.status = status;
      }

      if (ventureId) {
        updateData.ventureId = Number(ventureId);
      }

      if (status === "APPROVED") {
        const targetVentureId = ventureId ? Number(ventureId) : existing.ventureId;
        
        if (!targetVentureId) {
          return res.status(400).json({ error: "ventureId is required to approve and create customer" });
        }

        let customerId = existing.customerId;

        if (!customerId) {
          const duplicates = await findDuplicateCustomers({
            name: existing.customerLegalName,
            email: existing.contactEmail,
            phone: existing.contactPhone,
            tmsCustomerCode: existing.customerCode,
            state: existing.state,
            ventureId: targetVentureId,
          });

          if (isStrongMatch(duplicates)) {
            customerId = duplicates[0].id;
          } else {
            const newCustomer = await prisma.customer.create({
              data: {
                name: existing.customerLegalName,
                email: existing.contactEmail ?? null,
                phone: existing.contactPhone ?? null,
                tmsCustomerCode: existing.customerCode ?? null,
                address: [existing.addressLine1, existing.city, existing.state, existing.postalCode]
                  .filter(Boolean).join(", "),
                ventureId: targetVentureId,
                lifecycleStatus: "PROSPECT",
                source: "APPROVAL_REQUEST",
                isActive: true,
              },
            });
            customerId = newCustomer.id;
          }

          updateData.customerId = customerId;
        }

        const defaultLocation = await getOrCreateDefaultLocation({
          ventureId: targetVentureId,
          customerId,
        });

        const shipper = await prisma.logisticsShipper.update({
          where: { id: existing.shipperId || defaultLocation.id },
          data: {
            customerId,
            name: existing.customerLegalName,
            contactName: existing.contactName,
            email: existing.contactEmail,
            phone: existing.contactPhone,
            addressLine1: existing.addressLine1,
            addressLine2: existing.addressLine2,
            city: existing.city,
            state: existing.state,
            postalCode: existing.postalCode,
            country: existing.country,
            notes: existing.referenceNotes,
          },
        });
        updateData.shipperId = shipper.id;
        updateData.ventureId = targetVentureId;

        const linkedQuote = await prisma.freightQuote.findFirst({
          where: { approvalRequestId: existing.id },
        });

        if (linkedQuote) {
          await prisma.freightQuote.update({
            where: { id: linkedQuote.id },
            data: {
              status: "ACCEPTED",
              customerId,
              shipperId: updateData.shipperId ?? linkedQuote.shipperId,
              respondedAt: new Date(),
            },
          });
        }
      }

      if (status === "REJECTED") {
        const linkedQuote = await prisma.freightQuote.findFirst({
          where: { approvalRequestId: existing.id },
        });

        if (linkedQuote) {
          await prisma.freightQuote.update({
            where: { id: linkedQuote.id },
            data: {
              status: "REJECTED",
              respondedAt: new Date(),
              rejectionReasonText: decisionNotes ?? "Approval request rejected",
            },
          });
        }
      }

      const updated = await prisma.customerApprovalRequest.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          venture: { select: { id: true, name: true } },
          shipper: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      });

      return res.status(200).json({ ok: true, approval: updated });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("logistics/customer-approval-requests error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
