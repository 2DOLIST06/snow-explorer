import { adminFetch } from "@/lib/adminApi";
import { normalizeAnmsmWorkspace, normalizeAnmsmWorkspaceRow } from "@/lib/anmsmWorkspace";
import type { AnmsmWorkspace, ApiAnmsmPrepareResult, AnmsmBulkResult, AnmsmMappingPayload, AnmsmMappingResult, AnmsmResort } from "@/types/anmsmLogo";

const ROOT = "/api/admin/anmsm/logos";
const MAPPINGS_ROOT = "/api/admin/anmsm/station-mappings";

export class AnmsmApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    const detail = payload && typeof payload === "object" ? String((payload as { message?: unknown; error?: unknown }).message || (payload as { error?: unknown }).error || "") : "";
    super(detail || (status ? `L’API a répondu avec l’erreur HTTP ${status}.` : "L’API est indisponible ou la requête a expiré."));
  }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await adminFetch(path, init); }
  catch (error) { throw new AnmsmApiError(0, error); }
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new AnmsmApiError(response.status, body);
  return body as T;
}

const post = <T>(path: string, body: unknown) => json<T>(path, {
  method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body),
});

export const getAnmsmWorkspace = async (): Promise<AnmsmWorkspace> => {
  const payload = await json<unknown>(`${ROOT}/workspace`);
  const workspace = normalizeAnmsmWorkspace(payload);
  if (workspace.contractError && process.env.NODE_ENV === "development") console.error("[anmsmLogos] Invalid workspace response", payload);
  return workspace;
};
export const prepareAnmsmLogo = async (external_station_id: string) => {
  const response = await post<ApiAnmsmPrepareResult>(`${ROOT}/prepare`, { external_station_id });
  return { ...response, item: normalizeAnmsmWorkspaceRow(response?.item) };
};
export const bulkApproveAnmsmLogos = async (candidate_ids: number[]) => {
  const response = await post<AnmsmBulkResult>(`${ROOT}/bulk-approve`, { candidate_ids });
  return { ...response, results: Array.isArray(response.results) ? response.results : [] };
};
export const confirmAnmsmStationMappings = (mappings: AnmsmMappingPayload[]) => post<AnmsmMappingResult>(`${MAPPINGS_ROOT}/confirm`, { mappings });
export const searchAnmsmResorts = async (query: string) => {
  const response = await json<{ items?: AnmsmResort[] }>(`/api/admin/anmsm/resorts/search?q=${encodeURIComponent(query)}`);
  return { ...response, items: Array.isArray(response.items) ? response.items : [] };
};
