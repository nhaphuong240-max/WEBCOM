export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type CursorQuery = {
  cursor?: string;
  limit?: number;
};

export function normalizeLimit(limit?: number, max = 100, fallback = 20): number {
  if (!limit || Number.isNaN(limit)) return fallback;
  return Math.min(Math.max(1, Math.floor(limit)), max);
}
