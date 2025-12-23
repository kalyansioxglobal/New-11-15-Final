// Lightweight local shape for loads used when computing margins.
// This avoids a hard dependency on the Prisma-generated `Load` type.
export type MarginLoadLike = {
  billAmount: number | null;
  costAmount: number | null;
};

export function computeMarginFields(load: MarginLoadLike) {
  const bill = load.billAmount ?? 0;
  const cost = load.costAmount ?? 0;
  const margin = bill - cost;
  const marginPercent = bill > 0 ? margin / bill : 0;

  return { margin, marginPercent };
}
