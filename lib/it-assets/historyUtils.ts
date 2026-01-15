import prisma from "@/lib/prisma";

/**
 * Enriches IT asset history entries with user data (fromUser and toUser)
 * @param historyEntries - Array of history entries with fromUserId and toUserId
 * @returns History entries with attached fromUser and toUser objects
 */
export async function enrichHistoryWithUsers(historyEntries: Array<{
  fromUserId: number | null;
  toUserId: number | null;
  [key: string]: any;
}>): Promise<Array<{
  fromUserId: number | null;
  toUserId: number | null;
  fromUser: { id: number; fullName: string } | null;
  toUser: { id: number; fullName: string } | null;
  [key: string]: any;
}>> {
  if (!historyEntries || historyEntries.length === 0) {
    return historyEntries.map((entry) => ({
      ...entry,
      fromUser: null as { id: number; fullName: string } | null,
      toUser: null as { id: number; fullName: string } | null,
    }));
  }

  // Collect all unique user IDs from history entries
  const userIds = new Set<number>();
  historyEntries.forEach((entry) => {
    if (entry.fromUserId) userIds.add(entry.fromUserId);
    if (entry.toUserId) userIds.add(entry.toUserId);
  });

  if (userIds.size === 0) {
    // No user IDs to fetch, return entries with null user objects
    return historyEntries.map((entry) => ({
      ...entry,
      fromUser: null as { id: number; fullName: string } | null,
      toUser: null as { id: number; fullName: string } | null,
    }));
  }

  // Fetch all users in one query
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, fullName: true },
  });

  // Create a map for quick lookup
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Attach user data to history entries
  return historyEntries.map((entry) => ({
    ...entry,
    fromUser: (entry.fromUserId ? userMap.get(entry.fromUserId) || null : null) as { id: number; fullName: string } | null,
    toUser: (entry.toUserId ? userMap.get(entry.toUserId) || null : null) as { id: number; fullName: string } | null,
  }));
}

