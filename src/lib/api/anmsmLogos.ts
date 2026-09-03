import { adminFetch } from "@/lib/adminApi";
import type { AnmsmBulkResult, AnmsmLogoCandidate, AnmsmLogoFilters, AnmsmLogoList, AnmsmSelection, AnmsmSyncResult } from "@/types/anmsmLogo";
const ROOT = "/api/admin/anmsm/logos";
async function json<T>(path: string, init?: RequestInit): Promise<T> { const response = await adminFetch(path, init); const body = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error(body?.message || body?.error || (response.status === 403 ? "Vous n’avez pas l’autorisation nécessaire." : response.status === 401 ? "Votre session administrateur a expiré." : `Requête impossible (${response.status}).`)); Object.assign(error, { status: response.status, payload: body }); throw error; } return body as T; }
const post = <T>(path: string, body?: unknown) => json<T>(path, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body || {}) });
export function listAnmsmLogos(filters: AnmsmLogoFilters) { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); }); return json<AnmsmLogoList>(`${ROOT}?${query}`); }
export const getAnmsmLogo = (id: string) => json<AnmsmLogoCandidate>(`${ROOT}/${encodeURIComponent(id)}`);
export const syncAnmsmLogos = () => post<AnmsmSyncResult>(`${ROOT}/sync`);
export const bulkApproveAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-approve`, { candidate_ids });
export const bulkIgnoreAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-ignore`, { candidate_ids });
export const bulkReprocessAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-reprocess`, { candidate_ids });
export const restoreAnmsmLogo = (id: string) => post<AnmsmBulkResult>(`${ROOT}/${encodeURIComponent(id)}/restore`);
export function selectAllAnmsmLogos(filters: AnmsmLogoFilters) { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "" && key !== "page" && key !== "per_page") query.set(key, String(value)); }); return json<AnmsmSelection>(`${ROOT}/selection?${query}`); }
