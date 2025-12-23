import prisma from "@/lib/prisma";

// NOTE:
// - CarrierDispatcherExternal = external dispatcher contacts (Wave 16) stored in legacy
//   "CarrierDispatcher" table (name/email/phone per carrier)
// - CarrierDispatcher         = internal SIOX user-to-carrier mapping (Wave 17) stored in
//   separate "CarrierDispatcherInternal" table

export type CarrierDispatcherSummary = {
  userId: number;
  name: string;
  email: string | null;
};

/**
 * Rebuilds Carrier.dispatchersJson for a given carrier from CarrierDispatcher mappings.
 * Shape: [{ userId, name, email }]
 */
export async function syncCarrierDispatchersJson(carrierId: number): Promise<void> {
  const mappings = (await prisma.carrierDispatcher.findMany({
    where: { carrierId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })) ?? [];

  const summaries: CarrierDispatcherSummary[] = mappings
    .filter((m: any) => m.user)
    .map((m: any) => ({
      userId: m.user.id,
      name: m.user.fullName || `User #${m.user.id}`,
      email: m.user.email ?? null,
    }));

  await prisma.carrier.update({
    where: { id: carrierId },
    data: {
      dispatchersJson: summaries.length > 0 ? JSON.stringify(summaries) : null,
    },
  });
}

export function parseCarrierDispatchersJson(json: string | null | undefined): CarrierDispatcherSummary[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      userId: Number(item.userId),
      name: String(item.name ?? ""),
      email: item.email ?? null,
    }));
  } catch {
    return [];
  }
}
