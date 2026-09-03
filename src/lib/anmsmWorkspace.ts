import type { AnmsmWorkspace, AnmsmWorkspaceRow, AnmsmWorkspaceStats, ApiAnmsmWorkspace, ApiAnmsmWorkspaceItem } from "@/types/anmsmLogo";

export const EMPTY_ANMSM_STATS: AnmsmWorkspaceStats = {
  stations_received: 0,
  stations_matched: 0,
  stations_unmatched: 0,
  logos_available: 0,
  logos_without_source: 0,
  candidates_pending: 0,
  candidates_approved: 0,
  candidates_in_error: 0,
  candidates_to_prepare: 0,
};

const numberOrZero = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

export function normalizeAnmsmWorkspace(payload: unknown): AnmsmWorkspace {
  const response = payload && typeof payload === "object" ? payload as ApiAnmsmWorkspace : {};
  const rows = Array.isArray(response.rows) ? response.rows : [];
  const rawStats = response.stats && typeof response.stats === "object" ? response.stats : {};
  const stats = Object.fromEntries(Object.keys(EMPTY_ANMSM_STATS).map(key => [key, numberOrZero(rawStats[key as keyof AnmsmWorkspaceStats])])) as AnmsmWorkspaceStats;
  return {
    rows: rows.map(normalizeAnmsmWorkspaceRow),
    stats,
    contractError: Array.isArray(response.rows) ? null : "La réponse de l’API logos est invalide : la collection « rows » est absente.",
  };
}

export function normalizeAnmsmWorkspaceRow(row: ApiAnmsmWorkspaceItem): AnmsmWorkspaceRow {
  return { ...row, candidate: row?.candidate ? { ...row.candidate, warnings: Array.isArray(row.candidate.warnings) ? row.candidate.warnings : [] } : null };
}
