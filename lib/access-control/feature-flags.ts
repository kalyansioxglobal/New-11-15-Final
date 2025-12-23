import type { ModuleId } from "./routes";

export type FeatureFlag = {
  id: string;
  module: ModuleId;
  enabled: boolean;
  description: string;
};

const FEATURE_FLAGS: FeatureFlag[] = [
  { id: "command_center", module: "command_center", enabled: true, description: "Main dashboard and overview" },
  { id: "operations", module: "operations", enabled: true, description: "Tasks, EOD reports, and insurance" },
  { id: "it", module: "it", enabled: true, description: "IT asset management" },
  { id: "freight", module: "freight", enabled: true, description: "Freight/logistics operations" },
  { id: "hospitality", module: "hospitality", enabled: true, description: "Hotel management" },
  { id: "bpo", module: "bpo", enabled: true, description: "BPO call center operations" },
  { id: "saas", module: "saas", enabled: true, description: "SaaS customer and subscription management" },
  { id: "holdings", module: "holdings", enabled: true, description: "Holdings and asset management" },
  { id: "admin", module: "admin", enabled: true, description: "Administrative functions" },
  { id: "ai_tools", module: "freight", enabled: true, description: "AI-powered freight tools" },
  { id: "gamification", module: "admin", enabled: true, description: "Employee gamification features" },
];

let featureFlagOverrides: Map<string, boolean> = new Map();

export function isModuleEnabled(module: ModuleId): boolean {
  const override = featureFlagOverrides.get(module);
  if (override !== undefined) return override;
  
  const flag = FEATURE_FLAGS.find((f) => f.id === module);
  return flag?.enabled ?? false;
}

export function isFeatureEnabled(featureId: string): boolean {
  const override = featureFlagOverrides.get(featureId);
  if (override !== undefined) return override;
  
  const flag = FEATURE_FLAGS.find((f) => f.id === featureId);
  return flag?.enabled ?? false;
}

export function setFeatureFlag(featureId: string, enabled: boolean): void {
  featureFlagOverrides.set(featureId, enabled);
}

export function clearFeatureFlagOverrides(): void {
  featureFlagOverrides.clear();
}

export function getFeatureFlags(): FeatureFlag[] {
  return FEATURE_FLAGS.map((flag) => ({
    ...flag,
    enabled: featureFlagOverrides.get(flag.id) ?? flag.enabled,
  }));
}

export function getEnabledModules(): ModuleId[] {
  const modules = new Set<ModuleId>();
  for (const flag of FEATURE_FLAGS) {
    if (isFeatureEnabled(flag.id)) {
      modules.add(flag.module);
    }
  }
  return Array.from(modules);
}
