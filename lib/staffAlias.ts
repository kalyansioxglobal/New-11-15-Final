import { prisma } from "@/lib/prisma";
import { StaffRole } from "@prisma/client";

export type { StaffRole };

export type StaffAlias = {
  id: number;
  name: string;
  normalizedName: string;
  role: StaffRole;
  isPrimaryForUser: boolean;
  userId?: number | null;
};

export function normalizeName(name?: string | null): string | null {
  if (!name) return null;
  return name.trim().toUpperCase();
}

export async function getOrCreateAlias(
  rawName: string | null | undefined,
  role: StaffRole
): Promise<StaffAlias | null> {
  const normalizedName = normalizeName(rawName);
  if (!normalizedName) return null;

  let alias = await prisma.staffAlias.findUnique({
    where: { normalizedName },
  });

  if (!alias) {
    alias = await prisma.staffAlias.create({
      data: {
        name: rawName!.trim(),
        normalizedName,
        role,
        isPrimaryForUser: false,
      },
    });
  }

  return alias;
}

export async function getAliasId(
  rawName: string | null | undefined,
  role: StaffRole
): Promise<number | null> {
  const alias = await getOrCreateAlias(rawName, role);
  return alias?.id ?? null;
}

export async function linkAliasToUser(aliasId: number, userId: number, isPrimary = false) {
  return prisma.staffAlias.update({
    where: { id: aliasId },
    data: {
      userId,
      isPrimaryForUser: isPrimary,
    },
  });
}

export async function findAliasByNormalizedName(normalizedName: string) {
  return prisma.staffAlias.findUnique({
    where: { normalizedName },
  });
}

export async function getUserPrimaryAlias(userId: number) {
  return prisma.staffAlias.findFirst({
    where: {
      userId,
      isPrimaryForUser: true,
    },
  });
}

export class AliasCache {
  private cache = new Map<string, StaffAlias>();

  async preload() {
    const aliases = await prisma.staffAlias.findMany();
    for (const alias of aliases) {
      this.cache.set(alias.normalizedName, alias);
    }
  }

  async getOrCreate(rawName: string | null | undefined, role: StaffRole): Promise<StaffAlias | null> {
    const normalizedName = normalizeName(rawName);
    if (!normalizedName) return null;

    const cached = this.cache.get(normalizedName);
    if (cached) return cached;

    let alias = await prisma.staffAlias.findUnique({
      where: { normalizedName },
    });

    if (!alias) {
      alias = await prisma.staffAlias.create({
        data: {
          name: rawName!.trim(),
          normalizedName,
          role,
          isPrimaryForUser: false,
        },
      });
    }

    this.cache.set(normalizedName, alias);
    return alias;
  }

  async getId(rawName: string | null | undefined, role: StaffRole): Promise<number | null> {
    const alias = await this.getOrCreate(rawName, role);
    return alias?.id ?? null;
  }
}
