export function parseCoordinate(value: unknown, limit: number): number | null;
export function normalizeSeasonDate(value: unknown): string | null;
export function resolveStationSeasonDates(station?: { season_open_date?: unknown; season_close_date?: unknown }, widgets?: unknown): { openDate: string | null; closeDate: string | null };
