import type { PisteMapCandidate, PisteMapPreparePayload, PisteMapRow, PisteMapStats, PisteMapWarning, PisteMapWorkspace } from "@/types/anmsmPisteMap";

export const EMPTY_PISTE_MAP_STATS: PisteMapStats = { plans_ready: 0, plans_to_prepare: 0, plans_approved: 0, plans_detected: 0, stations_detected: 0, stations_matched: 0, stations_unmatched: 0, errors: 0 };
const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const text = (value: unknown) => typeof value === "string" ? value : "";
const nullableText = (value: unknown) => typeof value === "string" ? value : null;
const nullableNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const warning = (value: unknown): PisteMapWarning => { const item = object(value); return { code: text(item.code) || "warning", message: text(item.message), blocking: item.blocking === true }; };

export function normalizePisteMapRow(value: unknown): PisteMapRow {
  const row = object(value); const rawMapping = object(row.mapping); const rawSuggestion = object(row.suggestion); const rawCandidate = object(row.candidate);
  const candidateId = nullableNumber(row.candidate_id ?? rawCandidate.candidate_id); const rawStatus = row.candidate_status ?? rawCandidate.status;
  const status = rawStatus === "pending" || rawStatus === "ready" ? "pending" : rawStatus === "approved" || rawStatus === "published" ? "approved" : rawStatus === "error" ? "error" : null;
  const warnings = (Array.isArray(row.warnings) ? row.warnings : Array.isArray(rawCandidate.warnings) ? rawCandidate.warnings : []).map(warning);
  const stationId = nullableText(row.station_id); const displayUrl = nullableText(row.display_url ?? rawCandidate.display_url);
  const candidate: PisteMapCandidate | null = Object.keys(rawCandidate).length || candidateId !== null ? {
    candidate_id: candidateId ?? 0, checksum: text(rawCandidate.checksum), display_url: displayUrl,
    width: nullableNumber(rawCandidate.width ?? row.width), height: nullableNumber(rawCandidate.height ?? row.height),
    size_bytes: nullableNumber(rawCandidate.size_bytes ?? row.size_bytes), status: status === "pending" ? "ready" : status === "approved" ? "published" : "error",
    credit: nullableText(rawCandidate.credit ?? row.credit), error_message: nullableText(rawCandidate.error_message ?? row.error_message), warnings,
  } : null;
  return {
    external_station_id: text(row.external_station_id),
    external_station_name: text(row.external_station_name) || "Station inconnue", anmsm_station_name: text(row.anmsm_station_name) || "Station inconnue", anmsm_media_id: text(row.anmsm_media_id),
    mapping_status: text(row.mapping_status), station_id: stationId,
    title: text(row.title) || text(row.map_type) || "Plan des pistes", map_type: nullableText(row.map_type), source_url: nullableText(row.source_url),
    source_checksum: nullableText(row.source_checksum), preparation_required: row.preparation_required === true,
    mapping: stationId ? { station_id: stationId, station_name: text(row.station_name ?? rawMapping.station_name) || "Station inconnue", station_slug: nullableText(row.station_slug ?? rawMapping.station_slug) } : null,
    suggestion: Object.keys(rawSuggestion).length ? { station_id: text(rawSuggestion.station_id), station_name: text(rawSuggestion.station_name) || "Station inconnue", station_slug: nullableText(rawSuggestion.station_slug), score: nullableNumber(rawSuggestion.score) ?? 0, match_type: text(rawSuggestion.match_type) } : null,
    candidate, candidate_id: candidateId, candidate_status: status,
    anmsm_title: text(row.anmsm_title) || "Plan des pistes", candidate_original_url: nullableText(row.candidate_original_url), candidate_preview_url: nullableText(row.candidate_preview_url),
    current_plan_url: nullableText(row.current_plan_url), current_map_url: nullableText(row.current_map_url),
    current_map_width: nullableNumber(row.current_map_width), current_map_height: nullableNumber(row.current_map_height), current_map_size_bytes: nullableNumber(row.current_map_size_bytes),
    current_map_credit: nullableText(row.current_map_credit), warnings,
  };
}

export const pisteMapNeedsPreparation = (row: PisteMapRow) =>
  row.mapping_status === "matched" &&
  !!row.station_id &&
  row.preparation_required === true &&
  !!row.external_station_id &&
  !!row.anmsm_media_id &&
  !!row.source_url;

export const pisteMapPreparePayload = (row: PisteMapRow): PisteMapPreparePayload => ({
  external_station_id: row.external_station_id,
  anmsm_media_id: row.anmsm_media_id,
});

export function normalizePisteMapWorkspace(payload: unknown): PisteMapWorkspace {
  const response = object(payload); const rows = Array.isArray(response.rows) ? response.rows : []; const rawStats = object(response.stats);
  const stats = Object.fromEntries(Object.keys(EMPTY_PISTE_MAP_STATS).map(key => [key, nullableNumber(rawStats[key]) ?? 0])) as PisteMapStats;
  return { rows: rows.map(normalizePisteMapRow), stats, contractError: Array.isArray(response.rows) ? null : "La réponse de l’API des plans est invalide : la collection « rows » est absente." };
}
export const pisteMapReady = (row: PisteMapRow) => !!row.station_id && row.candidate_id !== null && row.candidate_status === "pending" && !!row.candidate_preview_url && row.preparation_required === false;
export const paginatePisteMaps = (rows: unknown, page: number, size: number): PisteMapRow[] => { const safe = Array.isArray(rows) ? rows : []; const count = size > 0 ? Math.floor(size) : 1; const current = page > 0 ? Math.floor(page) : 1; return safe.slice((current - 1) * count, current * count); };
