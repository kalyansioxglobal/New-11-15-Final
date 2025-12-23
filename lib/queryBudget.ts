type QueryBudgetConfig = {
  [path: string]: number;
};

const QUERY_BUDGETS: QueryBudgetConfig = {
  "/api/freight/loads": 6,
  "/api/freight/coverage-war-room": 10,
  "/api/freight/outreach-war-room": 10,
  "/api/admin/system-check/overview": 8,
  "/api/admin/system-check/data-integrity": 12,
};

const DEFAULT_BUDGET = 15;

let queryCount = 0;
let currentPath = "";
let isEnabled = process.env.NODE_ENV === "development" && process.env.QUERY_BUDGET_ENABLED === "true";

export function enableQueryBudget(enabled: boolean = true): void {
  isEnabled = enabled;
}

export function startQueryTracking(path: string): void {
  if (!isEnabled) return;
  currentPath = path;
  queryCount = 0;
}

export function incrementQueryCount(): void {
  if (!isEnabled) return;
  queryCount++;
}

export function endQueryTracking(): { path: string; count: number; budget: number; exceeded: boolean } | null {
  if (!isEnabled) return null;
  
  const budget = QUERY_BUDGETS[currentPath] || DEFAULT_BUDGET;
  const exceeded = queryCount > budget;
  
  if (exceeded) {
    console.warn(
      `[QueryBudget] EXCEEDED: ${currentPath} used ${queryCount} queries (budget: ${budget})`
    );
  } else if (process.env.QUERY_BUDGET_VERBOSE === "true") {
    console.log(
      `[QueryBudget] ${currentPath}: ${queryCount}/${budget} queries`
    );
  }
  
  const result = {
    path: currentPath,
    count: queryCount,
    budget,
    exceeded,
  };
  
  currentPath = "";
  queryCount = 0;
  
  return result;
}

export function getQueryCount(): number {
  return queryCount;
}

export function withQueryBudget<T>(path: string, fn: () => Promise<T>): Promise<T> {
  if (!isEnabled) return fn();
  
  startQueryTracking(path);
  return fn().finally(() => {
    endQueryTracking();
  });
}
