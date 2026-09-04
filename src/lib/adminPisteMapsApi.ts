import { adminFetch } from "@/lib/adminApi";
import { normalizePisteMapRow, normalizePisteMapWorkspace, pisteMapPreparePayload } from "@/lib/anmsmPisteMaps";
import type { PisteMapBulkResult, PisteMapResort, PisteMapRow, PisteMapWorkspace } from "@/types/anmsmPisteMap";

const ROOT = "/api/admin/anmsm/piste-maps";
async function json<T>(path: string, init?: RequestInit): Promise<T> { const response = await adminFetch(path, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(String(body?.message || body?.error || `Erreur HTTP ${response.status}`)); return body as T; }
const post = <T>(path: string, body: unknown) => json<T>(path, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
export async function getPisteMapWorkspace(): Promise<PisteMapWorkspace> { return normalizePisteMapWorkspace(await json<unknown>(`${ROOT}/workspace`)); }
export async function preparePisteMap(row: PisteMapRow) { const result = await post<{ item: unknown }>(`${ROOT}/prepare`, pisteMapPreparePayload(row)); return normalizePisteMapRow(result.item); }
export async function approvePisteMaps(candidate_ids: number[]) { const result = await post<PisteMapBulkResult>(`${ROOT}/bulk-approve`, { candidate_ids }); return { ...result, results: Array.isArray(result.results) ? result.results : [] }; }
export async function confirmPisteMapMapping(external_station_id: string, station_id: string) { return post<{ ok: boolean; results?: Array<{ ok: boolean; error?: string }> }>("/api/admin/anmsm/station-mappings/confirm", { mappings: [{ external_station_id, station_id }] }); }
export async function searchPisteMapResorts(query: string) { const result = await json<{ items?: PisteMapResort[] }>(`/api/admin/anmsm/resorts/search?q=${encodeURIComponent(query)}`); return Array.isArray(result.items) ? result.items : []; }
