import { FormEvent, useState, useEffect } from "react";
import Head from "next/head";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type FormState = {
  customerLegalName: string;
  dbaName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  customerCode: string;
  usdotNumber: string;
  mcNumber: string;
  referenceNotes: string;
  paymentTermsRequested: string;
  creditLimitRequested: string;
  requestedByName: string;
  requestedByEmail: string;
};

export default function LogisticsCustomerApprovalRequestPage() {
  const { effectiveUser } = useEffectiveUser();
  
  const [form, setForm] = useState<FormState>({
    customerLegalName: "",
    dbaName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "USA",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    website: "",
    customerCode: "",
    usdotNumber: "",
    mcNumber: "",
    referenceNotes: "",
    paymentTermsRequested: "Prepayment",
    creditLimitRequested: "",
    requestedByName: "",
    requestedByEmail: "",
  });

  useEffect(() => {
    if (effectiveUser) {
      setForm((prev) => ({
        ...prev,
        requestedByName: effectiveUser.name || "",
        requestedByEmail: effectiveUser.email || "",
      }));
    }
  }, [effectiveUser]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.customerLegalName || !form.addressLine1) {
      setError("Shipper Legal Name and Address Line 1 are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/logistics/customer-approval-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          creditLimitRequested: form.creditLimitRequested
            ? Number(form.creditLimitRequested)
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to submit request.");
      } else {
        setSuccess("Shipper account approval request submitted and sent for Logistics approval.");
        setForm((prev) => ({
          ...prev,
          customerLegalName: "",
          dbaName: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          postalCode: "",
          contactName: "",
          contactPhone: "",
          contactEmail: "",
          website: "",
          customerCode: "",
          usdotNumber: "",
          mcNumber: "",
          referenceNotes: "",
          creditLimitRequested: "",
        }));
      }
    } catch (err: any) {
      console.error(err);
      setError("Unexpected error submitting request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Logistics – Shipper Approval Request</title>
      </Head>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Shipper (Account) Approval Request</h1>
            <p className="text-sm text-gray-400">
              For <span className="font-semibold">Logistics only</span>. Sales and CSR can request
              new shipper accounts here. Auto-checks will run and the request is emailed to approvers.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 px-4 py-2 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Shipper Account Details</h2>
              <p className="text-xs text-gray-500 mb-2">
                For shipper accounts / distributors / logistics accounts. This will be tagged as{" "}
                <span className="font-semibold">LOGISTICS</span> in Command Center.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Shipper Legal Name *"
                  value={form.customerLegalName}
                  onChange={(v) => updateField("customerLegalName", v)}
                  placeholder="SDPMart Inc"
                />
                <Field
                  label="DBA (if any)"
                  value={form.dbaName}
                  onChange={(v) => updateField("dbaName", v)}
                  placeholder="SDP Mart"
                />
                <Field
                  label="Shipper Code (TMS / internal)"
                  value={form.customerCode}
                  onChange={(v) => updateField("customerCode", v)}
                  placeholder="SDP"
                />
                <Field
                  label="Website"
                  value={form.website}
                  onChange={(v) => updateField("website", v)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Address Line 1 *"
                  value={form.addressLine1}
                  onChange={(v) => updateField("addressLine1", v)}
                  placeholder="4700 US-377 Building 3A"
                />
                <Field
                  label="Address Line 2"
                  value={form.addressLine2}
                  onChange={(v) => updateField("addressLine2", v)}
                  placeholder="Suite / Unit"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Field
                  label="City"
                  value={form.city}
                  onChange={(v) => updateField("city", v)}
                  placeholder="Krugerville"
                />
                <Field
                  label="State"
                  value={form.state}
                  onChange={(v) => updateField("state", v)}
                  placeholder="TX"
                />
                <Field
                  label="Postal Code"
                  value={form.postalCode}
                  onChange={(v) => updateField("postalCode", v)}
                  placeholder="76227"
                />
                <Field
                  label="Country"
                  value={form.country}
                  onChange={(v) => updateField("country", v)}
                  placeholder="USA"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Contact & Commercial</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field
                  label="Contact Name"
                  value={form.contactName}
                  onChange={(v) => updateField("contactName", v)}
                  placeholder="Ravi"
                />
                <Field
                  label="Contact Phone"
                  value={form.contactPhone}
                  onChange={(v) => updateField("contactPhone", v)}
                  placeholder="+1 214 000 0000"
                />
                <Field
                  label="Contact Email"
                  value={form.contactEmail}
                  onChange={(v) => updateField("contactEmail", v)}
                  placeholder="sales@example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600 mb-1">
                    Payment Terms Requested
                  </label>
                  <select
                    value={form.paymentTermsRequested}
                    onChange={(e) => updateField("paymentTermsRequested", e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="Prepayment">Prepayment</option>
                    <option value="Net 7">Net 7</option>
                    <option value="Net 14">Net 14</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Field
                  label="Credit Limit Requested (USD)"
                  value={form.creditLimitRequested}
                  onChange={(v) => updateField("creditLimitRequested", v)}
                  placeholder="25000"
                />
                <div />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="USDOT (if also carrier/broker)"
                  value={form.usdotNumber}
                  onChange={(v) => updateField("usdotNumber", v)}
                  placeholder="1234567"
                />
                <Field
                  label="MC Number (optional)"
                  value={form.mcNumber}
                  onChange={(v) => updateField("mcNumber", v)}
                  placeholder="MC-123456"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Reference / Notes</label>
                <textarea
                  value={form.referenceNotes}
                  onChange={(e) => updateField("referenceNotes", e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px] text-gray-900"
                  placeholder="Example: Received quotation from WhatsApp via reference of XYZ. Customer specializes in grocery shipments TX–GA."
                />
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Requester</h2>
              <p className="text-xs text-gray-500">
                Auto-filled from your login. Approvers will see who made this request.
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600 mb-1">Submitted By</label>
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                  {form.requestedByName || form.requestedByEmail || "Loading..."}
                </div>
              </div>
              {form.requestedByName && form.requestedByEmail && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600 mb-1">Email</label>
                  <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                    {form.requestedByEmail}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">What will auto-checks do?</h2>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                <li>Validate phone line type & carrier (Twilio Lookup).</li>
                <li>Check domain age & WHOIS (WhoisXML).</li>
                <li>Look for Google rating & review count (Google Places).</li>
                <li>
                  If USDOT provided, check FMCSA status and OOS (safety flag) for shipper accounts
                  who are also carriers/brokers.
                </li>
              </ul>
              <p className="text-xs text-gray-600">
                Results + checklist will be sent via email only to the{" "}
                <span className="font-semibold">Logistics approver list</span>.
              </p>
            </section>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white"
            >
              {submitting ? "Submitting…" : "Submit Shipper Account for Approval"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-600 mb-1">{props.label}</label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
      />
    </div>
  );
}
