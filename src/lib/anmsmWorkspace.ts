import type { AnmsmLogoAlert, AnmsmWorkspace, AnmsmWorkspaceRow, AnmsmWorkspaceStats, ApiAnmsmWorkspace } from "@/types/anmsmLogo";

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
const stringOrEmpty = (value: unknown) => typeof value === "string" ? value : "";
const stringOrNull = (value: unknown) => typeof value === "string" ? value : null;
const objectOrNull = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function normalizeAnmsmWorkspace(payload: unknown): AnmsmWorkspace {
  const response = payload && typeof payload === "object" ? payload as ApiAnmsmWorkspace : {};
  const rows: unknown[] = Array.isArray(response.rows) ? response.rows : [];
  const rawStats = response.stats && typeof response.stats === "object" ? response.stats : {};
  const stats = Object.fromEntries(Object.keys(EMPTY_ANMSM_STATS).map(key => [key, numberOrZero(rawStats[key as keyof AnmsmWorkspaceStats])])) as AnmsmWorkspaceStats;
  return {
    rows: rows.map(normalizeAnmsmWorkspaceRow),
    stats,
    contractError: Array.isArray(response.rows) ? null : "La réponse de l’API logos est invalide : la collection « rows » est absente.",
  };
}

export function normalizeAnmsmWorkspaceRow(value: unknown, index = 0): AnmsmWorkspaceRow {
  const row = objectOrNull(value) || {};
  const mapping = objectOrNull(row.mapping);
  const suggestion = objectOrNull(row.suggestion);
  const candidate = objectOrNull(row.candidate);
  const externalStationId = stringOrEmpty(row.external_station_id) || `ligne-incomplete-${index + 1}`;

  return {
    external_station_id: externalStationId,
    external_station_name: stringOrEmpty(row.external_station_name) || "Station inconnue",
    anmsm_logo_url: stringOrNull(row.anmsm_logo_url),
    anmsm_logo_checksum: stringOrNull(row.anmsm_logo_checksum),
    mapping: mapping ? {
      station_id: stringOrEmpty(mapping.station_id), station_name: stringOrEmpty(mapping.station_name) || "Station inconnue",
      station_slug: stringOrNull(mapping.station_slug), current_logo_url: stringOrNull(mapping.current_logo_url), match_type: stringOrEmpty(mapping.match_type),
    } : null,
    suggestion: suggestion ? {
      station_id: stringOrEmpty(suggestion.station_id), station_name: stringOrEmpty(suggestion.station_name) || "Station inconnue",
      station_slug: stringOrNull(suggestion.station_slug), score: numberOrZero(suggestion.score), match_type: stringOrEmpty(suggestion.match_type),
    } : null,
    candidate: candidate ? {
      candidate_id: numberOrZero(candidate.candidate_id), checksum: stringOrEmpty(candidate.checksum),
      candidate_preview_url: stringOrNull(candidate.candidate_preview_url), optimized_size_bytes: candidate.optimized_size_bytes == null ? null : numberOrZero(candidate.optimized_size_bytes),
      warnings: (Array.isArray(candidate.warnings) ? candidate.warnings : []).map(normalizeWarning),
      status: candidate.status === "ready" || candidate.status === "published" || candidate.status === "error" ? candidate.status : "error",
      error_message: stringOrNull(candidate.error_message),
    } : null,
  };
}

function normalizeWarning(value: unknown): AnmsmLogoAlert {
  const warning = objectOrNull(value) || {};
  return { code: stringOrEmpty(warning.code) || "warning", message: stringOrEmpty(warning.message), blocking: warning.blocking === true };
}

export function paginateAnmsmRows(rows: unknown, page: number, pageSize: number): AnmsmWorkspaceRow[] {
  const filteredRows: AnmsmWorkspaceRow[] = Array.isArray(rows) ? rows : [];
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  return filteredRows.slice((safePage - 1) * safePageSize, safePage * safePageSize);
}
