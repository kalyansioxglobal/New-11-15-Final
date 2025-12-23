import {
  RawCsvRow,
  NormalizedRingCentralCall,
  NormalizedTmsLoad,
} from "./types";

function cleaned(str: string | undefined | null): string | null {
  if (!str) return null;
  const s = String(str).trim();
  return s.length ? s : null;
}

function parseMmDdYyyy(input: string | undefined | null): Date | null {
  if (!input) return null;
  const trimmed = input.toString().trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts.map((p) => parseInt(p, 10));
  if (!yyyy || !mm || !dd) return null;
  return new Date(yyyy, mm - 1, dd);
}

function toNumber(input: string | number | undefined | null): number | null {
  if (input === null || input === undefined) return null;
  const n =
    typeof input === "number"
      ? input
      : parseFloat(String(input).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function normalizeRingCentralRow(
  row: RawCsvRow,
): NormalizedRingCentralCall {
  const name = row["User Name"] || row["Name"] || row["User"];
  const email = row["Email"] || row["User Email"];
  const extension = row["Extension"] || row["Ext"];

  const totalCalls = parseInt(row["Total Calls"] || row["Calls"] || "0", 10) || 0;
  const totalMinutes =
    parseFloat(row["Total Duration (min)"] || row["Minutes"] || "0") || 0;

  return {
    rcUserName: cleaned(name),
    rcEmail: cleaned(email?.toLowerCase()),
    rcExtension: cleaned(extension),
    totalCalls,
    totalMinutes,
  };
}

export function normalizeTmsLoadRow(row: RawCsvRow): NormalizedTmsLoad {
  const pickupRaw = cleaned(row["Pickup Date"]);
  const deliveryRaw = cleaned(row["Delivery Date"]);

  return {
    tmsLoadId: cleaned(row["Load ID"] || row["loadnumber"] || row["ID"]) ?? "",

    tmsShipperCode: cleaned(row["Shipper Code"] || row["Shipper"]),
    tmsCustomerCode: cleaned(row["Customer Code"] || row["Customer Code#"]),
    tmsCarrierCode: cleaned(row["Carrier Code"] || row["Carrier Code#"]),

    tmsEmployeeCode: cleaned(
      row["User ID"] || row["Created By"] || row["Employee Code"],
    ),
    createdByTmsUserName: cleaned(row["Created By Name"]),

    customerName: cleaned(row["Customer Name"] || row["customername"]),
    carrierName: cleaned(row["Carrier Name"] || row["shipmentcarriername"]),

    salesAgentName: cleaned(row["Customer Sales Agent"] || row["Sales Agent"] || row["Sales Rep"]),
    csrName: cleaned(row["Customer Service Representative"] || row["CSR"] || row["CSR Name"]),
    dispatcherName: cleaned(row["Dispatcher"] || row["Dispatcher Name"]),

    pickupDate: pickupRaw ? new Date(pickupRaw) : null,
    deliveryDate: deliveryRaw ? new Date(deliveryRaw) : null,
    dispatchDate: parseMmDdYyyy(row["dispatchdate"]),

    status: cleaned(row["Status"] || row["shipmentstatus"]),
    referenceNo: cleaned(row["Reference"] || row["Ref #"]),

    billAmount: toNumber(row["bill"]),
    costAmount: toNumber(row["cost"]),
    marginAmount: toNumber(row["marginamount"]),
    marginPercentage: toNumber(row["marginpercentage"]),

    arInvoiceDate: parseMmDdYyyy(row["arinvoicedate"]),
    apInvoiceDate: parseMmDdYyyy(row["apinvoicedate"]),
    arPaymentStatus: cleaned(row["arpaymentstaus"]),
    arDatePaid: parseMmDdYyyy(row["ardatepaid"]),
    arBalanceDue: toNumber(row["arbalancedue"]),
  };
}

export function normalizeTms3plFinancialRow(
  row: RawCsvRow,
): NormalizedTmsLoad {
  return {
    tmsLoadId: cleaned(row["loadnumber"]) ?? "",

    tmsShipperCode: null,
    tmsCustomerCode: null,
    tmsCarrierCode: null,

    tmsEmployeeCode: null,
    createdByTmsUserName: cleaned(row["shipmentCreatedBy"]),

    customerName: cleaned(row["customername"]),
    carrierName: cleaned(row["shipmentcarriername"]),

    salesAgentName: cleaned(row["Customer Sales Agent"] || row["Sales Agent"]),
    csrName: cleaned(row["Customer Service Representative"] || row["CSR"]),
    dispatcherName: cleaned(row["Dispatcher"]),

    pickupDate: null,
    deliveryDate: null,
    dispatchDate: parseMmDdYyyy(row["dispatchdate"]),

    status: cleaned(row["shipmentstatus"]),
    referenceNo: null,

    billAmount: toNumber(row["bill"]),
    costAmount: toNumber(row["cost"]),
    marginAmount: toNumber(row["marginamount"]),
    marginPercentage: toNumber(row["marginpercentage"]),

    arInvoiceDate: parseMmDdYyyy(row["arinvoicedate"]),
    apInvoiceDate: parseMmDdYyyy(row["apinvoicedate"]),
    arPaymentStatus: cleaned(row["arpaymentstaus"]),
    arDatePaid: parseMmDdYyyy(row["ardatepaid"]),
    arBalanceDue: toNumber(row["arbalancedue"]),
  };
}
