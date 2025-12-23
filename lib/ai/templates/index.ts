import type { AiDraftTemplate } from "./freightTemplates";
import { freightTemplates } from "./freightTemplates";
import { hotelTemplates } from "./hotelTemplates";
import { bpoTemplates } from "./bpoTemplates";
import { opsDiagnosticsTemplates } from "./opsDiagnosticsTemplates";
import { tonePresets, type TonePreset } from "./tonePresets";

export type { AiDraftTemplate };
export { freightTemplates, hotelTemplates, bpoTemplates, opsDiagnosticsTemplates, tonePresets };

export function findTemplateById(id: string | undefined | null): AiDraftTemplate | undefined {
  if (!id) return undefined;
  const all = [...freightTemplates, ...hotelTemplates, ...bpoTemplates, ...opsDiagnosticsTemplates];
  return all.find((t) => t.id === id);
}

export function findToneById(id: string | undefined | null): TonePreset | undefined {
  if (!id) return undefined;
  return tonePresets.find((t) => t.id === id);
}
