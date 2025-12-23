/**
 * Cursor-Based Pagination Utilities
 * 
 * Provides cursor-based pagination for efficient large dataset handling.
 * Cursor pagination is more efficient than offset-based pagination at scale.
 */

export interface CursorPaginationParams {
  cursor?: string | number;
  limit?: number;
  maxLimit?: number;
  defaultLimit?: number;
}

export interface CursorPaginationResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | number | null;
}

/**
 * Parse cursor pagination parameters from request query
 */
export function parseCursorParams(
  query: Record<string, string | string[] | undefined>,
  options: { maxLimit?: number; defaultLimit?: number } = {}
): { cursor: number | undefined; limit: number } {
  const { maxLimit = 200, defaultLimit = 50 } = options;

  const cursorRaw = query.cursor;
  const cursor = cursorRaw
    ? (typeof cursorRaw === 'string' ? parseInt(cursorRaw, 10) : undefined)
    : undefined;
  
  const limitRaw = query.limit || query.pageSize;
  const limit = limitRaw
    ? Math.min(maxLimit, Math.max(1, Number(limitRaw) || defaultLimit))
    : defaultLimit;

  return { cursor, limit };
}

/**
 * Apply cursor pagination to Prisma query
 * 
 * @param items - Items fetched (should be limit + 1 to detect hasMore)
 * @param limit - Requested limit
 * @returns Pagination result with items, hasMore, and nextCursor
 */
export function applyCursorPagination<T extends { id: number }>(
  items: T[],
  limit: number
): CursorPaginationResult<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore && resultItems.length > 0
    ? resultItems[resultItems.length - 1].id
    : null;

  return {
    items: resultItems,
    hasMore,
    nextCursor,
  };
}

/**
 * Create cursor pagination response
 */
export function createCursorResponse<T extends { id: number }>(
  items: T[],
  limit: number
): CursorPaginationResult<T> {
  return applyCursorPagination(items, limit);
}


