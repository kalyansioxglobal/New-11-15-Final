import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { can } from "@/lib/permissions";
import { findDuplicateCustomers, isStrongMatch } from "@/lib/freight/customerDedupe";
import { getOrCreateDefaultLocation } from "@/lib/logistics/customerLocation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const {
      ventureId,
      customerId,
      shipperId,
      customerData,
      sellRate,
      buyRateEstimate,
      origin,
      destination,
      equipmentType,
      notes,
      expiresInDays,
      confirmDedupe,
    } = req.body;

    const targetVentureId = ventureId ?? user.ventureIds?.[0] ?? null;

    if (!targetVentureId) {
      return res.status(400).json({ error: "ventureId is required" });
    }

    if (!can(user, "create", "TASK", { ventureId: targetVentureId })) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    let finalCustomerId = customerId;
    let finalShipperId = shipperId;
    let customerTypeAtQuote: "EXISTING" | "NEW" = "EXISTING";

    if (customerId) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!existingCustomer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      if (!shipperId) {
        const defaultLocation = await getOrCreateDefaultLocation({
          ventureId: targetVentureId,
          customerId,
        });
        finalShipperId = defaultLocation.id;
      }

      customerTypeAtQuote = "EXISTING";
    } else if (customerData) {
      const { name, email, phone, tmsCustomerCode, address, state } = customerData;

      if (!name) {
        return res.status(400).json({ error: "Customer name is required" });
      }

      const duplicates = await findDuplicateCustomers({
        name,
        email,
        phone,
        tmsCustomerCode,
        state,
        ventureId: targetVentureId,
      });

      if (isStrongMatch(duplicates) && !confirmDedupe) {
        return res.status(200).json({
          needsConfirmation: true,
          duplicateCandidates: duplicates,
          message: "Potential duplicate customers found. Please confirm or select existing.",
        });
      }

      const newCustomer = await prisma.customer.create({
        data: {
          name,
          email: email ?? null,
          phone: phone ?? null,
          tmsCustomerCode: tmsCustomerCode ?? null,
          address: address ?? null,
          ventureId: targetVentureId,
          lifecycleStatus: "PROSPECT",
          source: "QUOTE",
          isActive: true,
        },
      });

      finalCustomerId = newCustomer.id;
      customerTypeAtQuote = "NEW";

      const defaultLocation = await getOrCreateDefaultLocation({
        ventureId: targetVentureId,
        customerId: newCustomer.id,
      });
      finalShipperId = defaultLocation.id;
    } else {
      return res.status(400).json({ error: "Either customerId or customerData is required" });
    }

    const marginEstimate = sellRate && buyRateEstimate ? sellRate - buyRateEstimate : null;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const quote = await prisma.freightQuote.create({
      data: {
        ventureId: targetVentureId,
        customerId: finalCustomerId,
        shipperId: finalShipperId ?? null,
        salespersonUserId: user.id,
        status: "DRAFT",
        customerTypeAtQuote,
        sellRate: sellRate ?? null,
        buyRateEstimate: buyRateEstimate ?? null,
        marginEstimate,
        origin: origin ?? null,
        destination: destination ?? null,
        equipmentType: equipmentType ?? null,
        notes: notes ?? null,
        expiresAt,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        shipper: { select: { id: true, name: true } },
        salesperson: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.status(201).json({ quote });
  } catch (err: any) {
    console.error("Error creating quote:", err);
    return res.status(err.statusCode ?? 500).json({ error: err.message ?? "Internal Server Error" });
  }
}
