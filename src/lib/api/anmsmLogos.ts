import { adminFetch } from "@/lib/adminApi";
import type {
  AnmsmBulkResult,
  AnmsmLogoCandidate,
  AnmsmLogoFilters,
  AnmsmLogoList,
  AnmsmSelection,
  AnmsmSyncResult,
} from "@/types/anmsmLogo";

const ROOT = "/api/admin/anmsm/logos";

const STATUS_MESSAGES: Record<number, string> = {
  401: "Votre session administrateur est absente ou a expiré. Reconnectez-vous.",
  403: "Votre compte administrateur n’est pas autorisé à effectuer cette action.",
  405: "La méthode ou la version actuellement déployée est incohérente.",
  409: "Une synchronisation ANMSM est déjà en cours. Aucun second traitement n’a été lancé.",
  422: "La requête de synchronisation est invalide.",
  500: "Le backend a rencontré une erreur pendant la synchronisation.",
  502: "Le service Render est temporairement indisponible (502). Réessayez dans quelques instants.",
  503: "Le service Render est temporairement indisponible (503). Réessayez dans quelques instants.",
  504: "Le service Render est temporairement indisponible (504). Réessayez dans quelques instants.",
};

export class AnmsmApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    const backendMessage = payload && typeof payload === "object"
      ? String((payload as { message?: unknown; error?: unknown }).message || (payload as { error?: unknown }).error || "")
      : "";
    super(STATUS_MESSAGES[status] || backendMessage || `Requête impossible (${status}).`);
    this.name = "AnmsmApiError";
  }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  // adminFetch is the shared cookie-session client used throughout the admin:
  // same API base, credentials, CSRF renewal and expired-session redirect.
  const response = await adminFetch(path, init);
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (process.env.NODE_ENV === "development") {
      console.error("[anmsmLogos] API error", { status: response.status, body });
    }
    throw new AnmsmApiError(response.status, body);
  }
  return body as T;
}

const post = <T>(path: string, body: unknown = {}) => json<T>(path, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify(body),
});

export function listAnmsmLogos(filters: AnmsmLogoFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return json<AnmsmLogoList>(`${ROOT}?${query}`);
}

export const getAnmsmLogo = (id: string) => json<AnmsmLogoCandidate>(`${ROOT}/${encodeURIComponent(id)}`);
export const syncAnmsmLogos = () => post<AnmsmSyncResult>(`${ROOT}/sync`);
export const bulkApproveAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-approve`, { candidate_ids });
export const bulkIgnoreAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-ignore`, { candidate_ids });
export const bulkReprocessAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-reprocess`, { candidate_ids });
export const restoreAnmsmLogo = (id: string) => post<AnmsmBulkResult>(`${ROOT}/${encodeURIComponent(id)}/restore`);

export function selectAllAnmsmLogos(filters: AnmsmLogoFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page" && key !== "per_page") query.set(key, String(value));
  });
  return json<AnmsmSelection>(`${ROOT}/selection?${query}`);
}
