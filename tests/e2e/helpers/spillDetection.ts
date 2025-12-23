import { Page, expect } from "@playwright/test";
import { TEST_VENTURES } from "../fixtures/selectors";

export async function assertNoSpill(
  page: Page,
  currentVenture: "siox" | "mb",
  pageData: { loadIds?: number[]; carrierIds?: number[] }
) {
  const otherVenture = currentVenture === "siox" ? "mb" : "siox";
  const otherVentureConfig = TEST_VENTURES[otherVenture];

  if (pageData.loadIds) {
    for (const id of pageData.loadIds) {
      if (
        id >= otherVentureConfig.loadIdRange.min &&
        id <= otherVentureConfig.loadIdRange.max
      ) {
        throw new Error(
          `SPILL DETECTED: Load ID ${id} from ${otherVenture} venture visible in ${currentVenture} context`
        );
      }
    }
  }

  if (pageData.carrierIds) {
    for (const id of pageData.carrierIds) {
      if (
        id >= otherVentureConfig.carrierIdRange.min &&
        id <= otherVentureConfig.carrierIdRange.max
      ) {
        throw new Error(
          `SPILL DETECTED: Carrier ID ${id} from ${otherVenture} venture visible in ${currentVenture} context`
        );
      }
    }
  }
}

export async function extractIdsFromPage(
  page: Page,
  selector: string
): Promise<number[]> {
  const elements = await page.locator(selector).all();
  const ids: number[] = [];

  for (const el of elements) {
    const dataId = await el.getAttribute("data-id");
    if (dataId) {
      const id = parseInt(dataId, 10);
      if (!isNaN(id)) {
        ids.push(id);
      }
    }
  }

  return ids;
}

export async function apiVentureInjectionTest(
  page: Page,
  baseURL: string,
  endpoint: string,
  currentVentureId: number,
  otherVentureId: number
): Promise<{ passed: boolean; message: string }> {
  const urlWithInjection = `${baseURL}${endpoint}${endpoint.includes("?") ? "&" : "?"}ventureId=${otherVentureId}`;
  
  const response = await page.request.get(urlWithInjection);
  
  if (!response.ok()) {
    return {
      passed: true,
      message: `API correctly rejected injection attempt with status ${response.status()}`,
    };
  }

  const data = await response.json();
  
  if (Array.isArray(data)) {
    const hasOtherVentureData = data.some(
      (item: { ventureId?: number }) => item.ventureId === otherVentureId
    );
    if (hasOtherVentureData) {
      return {
        passed: false,
        message: `SPILL: API returned data from ventureId ${otherVentureId} when user is in venture ${currentVentureId}`,
      };
    }
  }

  return {
    passed: true,
    message: "API correctly filtered/ignored injection attempt",
  };
}

export async function assertVentureIsolation(
  page: Page,
  baseURL: string,
  endpoints: string[],
  currentVentureId: number,
  otherVentureId: number
): Promise<void> {
  for (const endpoint of endpoints) {
    const result = await apiVentureInjectionTest(
      page,
      baseURL,
      endpoint,
      currentVentureId,
      otherVentureId
    );
    
    if (!result.passed) {
      throw new Error(`Venture isolation failed for ${endpoint}: ${result.message}`);
    }
  }
}
