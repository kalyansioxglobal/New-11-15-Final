export type RawCsvRow = Record<string, string>;

export interface NormalizedRingCentralCall {
  rcUserName: string | null;
  rcEmail: string | null;
  rcExtension: string | null;
  totalCalls: number;
  totalMinutes: number;
}

export interface NormalizedTmsLoad {
  tmsLoadId: string;

  tmsShipperCode: string | null;
  tmsCustomerCode: string | null;
  tmsCarrierCode: string | null;
  tmsEmployeeCode: string | null;
  createdByTmsUserName: string | null;

  customerName: string | null;
  carrierName: string | null;

  salesAgentName: string | null;
  csrName: string | null;
  dispatcherName: string | null;

  pickupDate: Date | null;
  deliveryDate: Date | null;
  dispatchDate: Date | null;

  status: string | null;
  referenceNo: string | null;

  billAmount: number | null;
  costAmount: number | null;
  marginAmount: number | null;
  marginPercentage: number | null;

  arInvoiceDate: Date | null;
  apInvoiceDate: Date | null;
  arPaymentStatus: string | null;
  arDatePaid: Date | null;
  arBalanceDue: number | null;
}
