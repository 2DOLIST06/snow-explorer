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
  const candidateIdValue = row.candidate_id ?? candidate?.candidate_id;
  const candidateId = typeof candidateIdValue === "number" && Number.isFinite(candidateIdValue) ? candidateIdValue : null;
  const rawCandidateStatus = row.candidate_status ?? candidate?.status;
  const candidateStatus = rawCandidateStatus === "pending" || rawCandidateStatus === "ready" ? "pending" : rawCandidateStatus === "approved" || rawCandidateStatus === "published" ? "approved" : rawCandidateStatus === "error" ? "error" : null;
  const candidatePreviewUrl = stringOrNull(row.candidate_preview_url ?? candidate?.candidate_preview_url);
  const warnings = (Array.isArray(row.warnings) ? row.warnings : Array.isArray(candidate?.warnings) ? candidate.warnings : []).map(normalizeWarning);
  const stationId = stringOrNull(row.station_id ?? mapping?.station_id);
  const stationName = stringOrNull(row.station_name ?? mapping?.station_name);
  const currentLogoUrl = stringOrNull(row.current_logo_url ?? mapping?.current_logo_url);
  const externalStationId = stringOrEmpty(row.external_station_id) || `ligne-incomplete-${index + 1}`;

  return {
    external_station_id: externalStationId,
    external_station_name: stringOrEmpty(row.external_station_name) || "Station inconnue",
    anmsm_logo_url: stringOrNull(row.anmsm_logo_url),
    anmsm_logo_checksum: stringOrNull(row.anmsm_logo_checksum),
    preparation_required: row.preparation_required === true,
    candidate_id: candidateId,
    candidate_status: candidateStatus,
    candidate_preview_url: candidatePreviewUrl,
    station_id: stationId,
    station_name: stationName,
    current_logo_url: currentLogoUrl,
    warnings,
    mapping: mapping || stationId ? {
      station_id: stationId || "", station_name: stationName || "Station inconnue",
      station_slug: stringOrNull(mapping?.station_slug ?? row.station_slug), current_logo_url: currentLogoUrl, match_type: stringOrEmpty(mapping?.match_type ?? row.match_type),
    } : null,
    suggestion: suggestion ? {
      station_id: stringOrEmpty(suggestion.station_id), station_name: stringOrEmpty(suggestion.station_name) || "Station inconnue",
      station_slug: stringOrNull(suggestion.station_slug), score: numberOrZero(suggestion.score), match_type: stringOrEmpty(suggestion.match_type),
    } : null,
    candidate: candidate || candidateId !== null ? {
      candidate_id: candidateId ?? 0, checksum: stringOrEmpty(candidate?.checksum),
      candidate_preview_url: candidatePreviewUrl, optimized_size_bytes: (row.optimized_size_bytes ?? candidate?.optimized_size_bytes) == null ? null : numberOrZero(row.optimized_size_bytes ?? candidate?.optimized_size_bytes),
      warnings,
      status: candidateStatus === "pending" ? "ready" : candidateStatus === "approved" ? "published" : "error",
      error_message: stringOrNull(candidate?.error_message ?? row.error_message),
    } : null,
  };
}

export const isAnmsmRowReadyToPublish = (row: AnmsmWorkspaceRow) => row.candidate_id !== null && row.candidate_status === "pending";

export function filterAnmsmRowsReadyToPublish(rows: AnmsmWorkspaceRow[]): AnmsmWorkspaceRow[] {
  return rows.filter(isAnmsmRowReadyToPublish);
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
