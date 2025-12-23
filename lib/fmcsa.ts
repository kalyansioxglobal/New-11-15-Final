export type FmcsaLookupType = "MC" | "DOT";

export type NormalizedCarrierStatus =
  | "ACTIVE"
  | "OUT_OF_SERVICE"
  | "NOT_AUTHORIZED"
  | "INACTIVE"
  | "UNKNOWN";

export interface NormalizedCarrier {
  name: string;
  legalName: string | null;
  dbaName: string | null;
  dotNumber: string | null;
  mcNumber: string | null;
  ein: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  powerUnits: number | null;
  drivers: number | null;
  operatingStatus: string | null;
  entityType: string | null;
  isPassengerCarrier: boolean | null;
  safetyRating: string | null;
  safetyRatingDate: string | null;
  mcs150Outdated: boolean | null;
  oosDate: string | null;
  issScore: number | null;
  bipdInsuranceOnFile: number | null;
  bipdInsuranceRequired: boolean | null;
  bipdRequiredAmount: number | null;
  cargoInsuranceOnFile: number | null;
  cargoInsuranceRequired: boolean | null;
  bondInsuranceOnFile: number | null;
  bondInsuranceRequired: boolean | null;
  crashTotal: number | null;
  fatalCrash: number | null;
  injCrash: number | null;
  towawayCrash: number | null;
  driverInsp: number | null;
  driverOosInsp: number | null;
  driverOosRate: number | null;
  driverOosRateNationalAverage: number | null;
  vehicleInsp: number | null;
  vehicleOosInsp: number | null;
  vehicleOosRate: number | null;
  vehicleOosRateNationalAverage: number | null;
  hazmatInsp: number | null;
  hazmatOosInsp: number | null;
  hazmatOosRate: number | null;
  hazmatOosRateNationalAverage: number | null;
  statusText: string | null;
  normalizedStatus: NormalizedCarrierStatus;
  raw: any;
}

function normalizeFmcsaStatus(statusRaw: string | null): NormalizedCarrierStatus {
  if (!statusRaw) return "UNKNOWN";

  const s = statusRaw.toLowerCase();

  if (s.includes("out of service")) return "OUT_OF_SERVICE";
  if (s.includes("not authorized")) return "NOT_AUTHORIZED";
  if (s.includes("inactive")) return "INACTIVE";
  if (s.includes("authorized")) return "ACTIVE";

  return "UNKNOWN";
}

function formatOperatingStatus(carrier: any): string | null {
  const parts: string[] = [];
  
  if (carrier.commonAuthorityStatus === "A") parts.push("Common Authority: Active");
  else if (carrier.commonAuthorityStatus === "I") parts.push("Common Authority: Inactive");
  else if (carrier.commonAuthorityStatus === "N") parts.push("Common Authority: None");
  
  if (carrier.contractAuthorityStatus === "A") parts.push("Contract Authority: Active");
  else if (carrier.contractAuthorityStatus === "I") parts.push("Contract Authority: Inactive");
  
  if (carrier.brokerAuthorityStatus === "A") parts.push("Broker Authority: Active");
  else if (carrier.brokerAuthorityStatus === "I") parts.push("Broker Authority: Inactive");
  
  if (carrier.carrierOperation?.carrierOperationDesc) {
    parts.push(`Operation: ${carrier.carrierOperation.carrierOperationDesc}`);
  }
  
  return parts.length > 0 ? parts.join("; ") : null;
}

function getEntityType(carrier: any): string | null {
  if (carrier.censusTypeId?.censusTypeDesc) {
    return carrier.censusTypeId.censusTypeDesc;
  }
  if (carrier.censusTypeId?.censusType) {
    const typeMap: Record<string, string> = {
      'C': 'Carrier',
      'B': 'Broker',
      'F': 'Freight Forwarder',
    };
    return typeMap[carrier.censusTypeId.censusType] || carrier.censusTypeId.censusType;
  }
  return null;
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function parseBoolean(val: any): boolean | null {
  if (val === null || val === undefined) return null;
  if (val === 'Y' || val === 'y' || val === true) return true;
  if (val === 'N' || val === 'n' || val === false) return false;
  return null;
}

export async function lookupCarrierFromFmcsa(
  type: FmcsaLookupType,
  value: string
): Promise<NormalizedCarrier | null> {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("MC/DOT value is required.");
  }

  const webKey = process.env.FMCSA_WEBKEY;
  if (!webKey) {
    throw new Error("FMCSA_WEBKEY is not configured.");
  }

  let url: string;
  if (type === "DOT") {
    url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${encodeURIComponent(
      trimmed
    )}?webKey=${encodeURIComponent(webKey)}`;
  } else {
    url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/docket-number/${encodeURIComponent(
      trimmed
    )}?webKey=${encodeURIComponent(webKey)}`;
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`FMCSA API returned ${response.status}`);
  }

  const data = await response.json();
  
  if (!data || !data.content || !data.content.carrier) {
    return null;
  }

  const carrier = Array.isArray(data.content.carrier) 
    ? data.content.carrier[0] 
    : data.content.carrier;
    
  if (!carrier) {
    return null;
  }

  const legalName = carrier.legalName || null;
  const dbaName = carrier.dbaName || null;
  const companyName = legalName || dbaName || carrier.carrierOperation?.carrierName || "";

  const dotNumberVal = String(carrier.dotNumber || "").trim() || null;
  const mcNumberVal = (carrier.mcNumber && String(carrier.mcNumber).trim()) || null;
  const einVal = carrier.ein ? String(carrier.ein) : null;

  const phone = (carrier.phoneNumber && String(carrier.phoneNumber).trim()) || null;
  const email = (carrier.emailAddress && String(carrier.emailAddress).trim()) || null;

  const address1 = carrier.phyStreet || null;
  const city = carrier.phyCity || null;
  const state = carrier.phyState || null;
  const zip = carrier.phyZipcode || null;

  const powerUnits = parseNumber(carrier.totalPowerUnits);
  const drivers = parseNumber(carrier.totalDrivers);

  const operatingStatus = formatOperatingStatus(carrier);
  const entityType = getEntityType(carrier);
  const isPassengerCarrier = parseBoolean(carrier.isPassengerCarrier);

  const safetyRating = carrier.safetyRating || null;
  const safetyRatingDate = carrier.safetyRatingDate || null;
  const mcs150Outdated = parseBoolean(carrier.mcs150Outdated);
  const oosDate = carrier.oosDate || null;
  const issScore = parseNumber(carrier.issScore);

  const bipdInsuranceOnFile = parseNumber(carrier.bipdInsuranceOnFile);
  const bipdInsuranceRequired = parseBoolean(carrier.bipdInsuranceRequired);
  const bipdRequiredAmount = parseNumber(carrier.bipdRequiredAmount);
  const cargoInsuranceOnFile = parseNumber(carrier.cargoInsuranceOnFile);
  const cargoInsuranceRequired = parseBoolean(carrier.cargoInsuranceRequired);
  const bondInsuranceOnFile = parseNumber(carrier.bondInsuranceOnFile);
  const bondInsuranceRequired = parseBoolean(carrier.bondInsuranceRequired);

  const crashTotal = parseNumber(carrier.crashTotal);
  const fatalCrash = parseNumber(carrier.fatalCrash);
  const injCrash = parseNumber(carrier.injCrash);
  const towawayCrash = parseNumber(carrier.towawayCrash);

  const driverInsp = parseNumber(carrier.driverInsp);
  const driverOosInsp = parseNumber(carrier.driverOosInsp);
  const driverOosRate = parseNumber(carrier.driverOosRate);
  const driverOosRateNationalAverage = parseNumber(carrier.driverOosRateNationalAverage);

  const vehicleInsp = parseNumber(carrier.vehicleInsp);
  const vehicleOosInsp = parseNumber(carrier.vehicleOosInsp);
  const vehicleOosRate = parseNumber(carrier.vehicleOosRate);
  const vehicleOosRateNationalAverage = parseNumber(carrier.vehicleOosRateNationalAverage);

  const hazmatInsp = parseNumber(carrier.hazmatInsp);
  const hazmatOosInsp = parseNumber(carrier.hazmatOosInsp);
  const hazmatOosRate = parseNumber(carrier.hazmatOosRate);
  const hazmatOosRateNationalAverage = parseNumber(carrier.hazmatOosRateNationalAverage);

  let statusText: string | null = null;
  
  if (carrier.oosDate) {
    statusText = "OUT OF SERVICE";
  } else if (carrier.statusCode === "OOS" || carrier.statusCode === "O") {
    statusText = "OUT OF SERVICE";
  } else if (carrier.allowedToOperate === "Y") {
    statusText = "AUTHORIZED";
  } else if (carrier.allowedToOperate === "N") {
    statusText = "NOT AUTHORIZED";
  } else if (carrier.carrierOperation?.operatingStatus) {
    statusText = carrier.carrierOperation.operatingStatus;
  }

  const normalizedStatus = normalizeFmcsaStatus(statusText);

  return {
    name: companyName,
    legalName,
    dbaName,
    dotNumber: dotNumberVal,
    mcNumber: mcNumberVal,
    ein: einVal,
    phone,
    email,
    addressLine1: address1,
    addressLine2: null,
    city,
    state,
    postalCode: zip,
    country: "US",
    powerUnits,
    drivers,
    operatingStatus,
    entityType,
    isPassengerCarrier,
    safetyRating,
    safetyRatingDate,
    mcs150Outdated,
    oosDate,
    issScore,
    bipdInsuranceOnFile,
    bipdInsuranceRequired,
    bipdRequiredAmount,
    cargoInsuranceOnFile,
    cargoInsuranceRequired,
    bondInsuranceOnFile,
    bondInsuranceRequired,
    crashTotal,
    fatalCrash,
    injCrash,
    towawayCrash,
    driverInsp,
    driverOosInsp,
    driverOosRate,
    driverOosRateNationalAverage,
    vehicleInsp,
    vehicleOosInsp,
    vehicleOosRate,
    vehicleOosRateNationalAverage,
    hazmatInsp,
    hazmatOosInsp,
    hazmatOosRate,
    hazmatOosRateNationalAverage,
    statusText,
    normalizedStatus,
    raw: carrier,
  };
}
