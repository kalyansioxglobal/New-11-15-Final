import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";

const TEMPLATE_FIELDS: Record<string, { headers: string[]; sampleRow: string[] }> = {
  LOADS: {
    headers: [
      "referenceNumber",
      "pickupDate",
      "deliveryDate",
      "shipperName",
      "customerName",
      "originCity",
      "originState",
      "originZip",
      "destCity",
      "destState",
      "destZip",
      "equipment",
      "weight",
      "customerRate",
      "carrierRate",
      "margin",
      "notes",
    ],
    sampleRow: [
      "LD-12345",
      "2024-01-15",
      "2024-01-17",
      "ABC Shipper",
      "XYZ Customer",
      "Chicago",
      "IL",
      "60601",
      "Dallas",
      "TX",
      "75201",
      "VAN",
      "42000",
      "2500",
      "1800",
      "700",
      "Priority load",
    ],
  },
  SHIPPERS: {
    headers: ["name", "contact", "email", "phone", "address", "city", "state", "zip", "notes"],
    sampleRow: [
      "ABC Manufacturing",
      "John Smith",
      "john@abc.com",
      "555-123-4567",
      "123 Industrial Blvd",
      "Chicago",
      "IL",
      "60601",
      "Top shipper",
    ],
  },
  CARRIERS: {
    headers: [
      "name",
      "mcNumber",
      "dotNumber",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "zip",
      "equipment",
      "lanes",
      "notes",
    ],
    sampleRow: [
      "Fast Freight LLC",
      "MC123456",
      "DOT789012",
      "555-987-6543",
      "dispatch@fastfreight.com",
      "456 Trucking Way",
      "Dallas",
      "TX",
      "75201",
      "VAN,FLATBED",
      "TX-IL,IL-CA",
      "Reliable carrier",
    ],
  },
  HOTEL_KPIS: {
    headers: [
      "date",
      "hotelId",
      "ventureId",
      "roomsSold",
      "roomsAvailable",
      "occupancyPct",
      "roomRevenue",
      "adr",
      "revpar",
      "otherRevenue",
      "totalRevenue",
      "grossOperatingProfit",
      "goppar",
      "cancellations",
      "noShows",
      "walkins",
      "complaints",
      "roomsOutOfOrder",
      "reviewScore",
    ],
    sampleRow: [
      "2024-01-15",
      "1",
      "1",
      "85",
      "100",
      "85",
      "12750",
      "150",
      "127.50",
      "2500",
      "15250",
      "6100",
      "61",
      "3",
      "2",
      "5",
      "1",
      "2",
      "4.5",
    ],
  },
  HOTEL_DAILY: {
    headers: [
      "date",
      "hotelId",
      "totalRoom",
      "roomSold",
      "cash",
      "credit",
      "online",
      "refund",
      "total",
      "dues",
      "lostDues",
      "occupancy",
      "revpar",
    ],
    sampleRow: [
      "2024-01-15",
      "1",
      "100",
      "85",
      "2500",
      "8500",
      "1500",
      "150",
      "12350",
      "450",
      "75",
      "85",
      "123.50",
    ],
  },
  FREIGHT_KPIS: {
    headers: [
      "date",
      "ventureId",
      "loadsInbound",
      "loadsQuoted",
      "loadsCovered",
      "loadsLost",
      "totalRevenue",
      "totalCost",
      "totalProfit",
      "avgMarginPct",
      "activeShippers",
      "newShippers",
      "churnedShippers",
      "reactivatedShippers",
      "atRiskShippers",
      "activeCarriers",
      "newCarriers",
    ],
    sampleRow: [
      "2024-01-15",
      "1",
      "50",
      "45",
      "40",
      "5",
      "125000",
      "95000",
      "30000",
      "24",
      "25",
      "3",
      "1",
      "2",
      "4",
      "40",
      "5",
    ],
  },
  HOTEL_DISPUTES: {
    headers: [
      "propertyId",
      "type",
      "disputedAmount",
      "originalAmount",
      "channel",
      "reservationId",
      "folioNumber",
      "guestName",
      "guestEmail",
      "guestPhone",
      "postedDate",
      "stayFrom",
      "stayTo",
      "reason",
      "evidenceDueDate",
    ],
    sampleRow: [
      "1",
      "CHARGEBACK",
      "250.00",
      "275.00",
      "OTA",
      "RES-12345",
      "FOL-67890",
      "Jane Doe",
      "jane@email.com",
      "555-123-4567",
      "2024-01-10",
      "2024-01-05",
      "2024-01-07",
      "Card not present",
      "2024-01-25",
    ],
  },
  HOTEL_REVIEWS: {
    headers: [
      "propertyId",
      "rating",
      "source",
      "guestName",
      "reviewDate",
      "title",
      "reviewText",
      "responseText",
    ],
    sampleRow: [
      "1",
      "4.5",
      "GOOGLE",
      "John Guest",
      "2024-01-15",
      "Great experience",
      "Great stay, friendly staff!",
      "Thank you for your feedback!",
    ],
  },
  BPO_METRICS: {
    headers: [
      "date",
      "campaignId",
      "outboundCalls",
      "handledCalls",
      "talkTimeMin",
      "leadsCreated",
      "demosBooked",
      "salesClosed",
      "fteCount",
      "avgQaScore",
      "revenue",
      "cost",
    ],
    sampleRow: [
      "2024-01-15",
      "1",
      "500",
      "350",
      "1200",
      "45",
      "12",
      "8",
      "10.5",
      "92.5",
      "25000",
      "18000",
    ],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const { type, format = "csv" } = req.query;

  if (!type || typeof type !== "string") {
    return res.status(400).json({ error: "type query parameter is required" });
  }

  const template = TEMPLATE_FIELDS[type];
  if (!template) {
    return res.status(400).json({
      error: `Unknown type: ${type}. Valid types: ${Object.keys(TEMPLATE_FIELDS).join(", ")}`,
    });
  }

  const { headers, sampleRow } = template;

  if (format === "json") {
    return res.status(200).json({
      type,
      headers,
      sampleRow,
    });
  }

  const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");

  const filename = `${type.toLowerCase()}_import_template.csv`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(csvContent);
}
