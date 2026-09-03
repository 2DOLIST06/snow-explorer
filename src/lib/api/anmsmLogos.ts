import { adminFetch } from "@/lib/adminApi";
import type {
  AnmsmBulkResult,
  AnmsmLogoCandidate,
  AnmsmLogoFilters,
  AnmsmLogoList,
  ApiLogoCandidate,
  ApiLogoList,
  AnmsmSelection,
  AnmsmSyncResult,
  AnmsmMappingList,
  ApiStationMappingsResponse,
  AnmsmMappingResult,
  AnmsmMappingPayload,
  AnmsmResort,
} from "@/types/anmsmLogo";

const ROOT = "/api/admin/anmsm/logos";
const MAPPINGS_ROOT = "/api/admin/anmsm/station-mappings";

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
  return json<ApiLogoList>(`${ROOT}?${query}`).then(normalizeLogoList);
}

export const normalizeLogoCandidate = (item: ApiLogoCandidate): AnmsmLogoCandidate => ({
  id: item.id,
  stationId: item.station_id,
  stationName: item.station_name,
  stationSlug: item.station_slug,
  externalStationId: item.external_station_id,
  anmsmMediaId: item.anmsm_media_id,
  anmsmTitle: item.anmsm_title,
  anmsmCredit: item.anmsm_credit,
  sourceUrl: item.source_url,
  sourceFormat: item.source_format,
  sourceWidth: item.source_width,
  sourceHeight: item.source_height,
  sourceSizeBytes: item.source_size_bytes,
  sourceChecksum: item.source_checksum,
  optimizedUrl: item.optimized_url,
  optimizedS3Key: item.optimized_s3_key,
  optimizedWidth: item.optimized_width,
  optimizedHeight: item.optimized_height,
  optimizedSizeBytes: item.optimized_size_bytes,
  contentWidth: item.content_width,
  contentHeight: item.content_height,
  aspectRatio: item.aspect_ratio,
  visualOccupancyWidth: item.visual_occupancy_width,
  visualOccupancyHeight: item.visual_occupancy_height,
  currentLogoUrl: item.current_logo_url ?? null,
  previousLogoUrl: item.previous_logo_url ?? null,
  detectedAt: item.detected_at,
  checkedAt: item.checked_at,
  status: item.status,
  warnings: Array.isArray(item.warnings) ? item.warnings : Array.isArray(item.alerts) ? item.alerts : [],
  errorCode: item.error_code,
  errorMessage: item.error_message,
  versions: item.versions?.map(version => ({ ...version, createdAt: version.created_at })),
  canRestore: item.can_restore,
});

const normalizeLogoList = (response: ApiLogoList): AnmsmLogoList => ({
  items: Array.isArray(response.items) ? response.items.map(normalizeLogoCandidate) : [],
  page: response.page,
  perPage: response.per_page,
  total: response.total,
  pages: response.pages,
});

export const getAnmsmLogo = (id: string) => json<ApiLogoCandidate>(`${ROOT}/${encodeURIComponent(id)}`).then(normalizeLogoCandidate);
export const syncAnmsmLogos = (cursor: string | null) => post<AnmsmSyncResult>(`${ROOT}/sync`, { cursor, batch_size: 1 });
export const bulkApproveAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-approve`, { candidate_ids });
export const bulkIgnoreAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-ignore`, { candidate_ids });
export const bulkReprocessAnmsmLogos = (candidate_ids: string[]) => post<AnmsmBulkResult>(`${ROOT}/bulk-reprocess`, { candidate_ids });
export const restoreAnmsmLogo = (id: string) => post<AnmsmBulkResult>(`${ROOT}/${encodeURIComponent(id)}/restore`);

export function listAnmsmStationMappings(filters: { search?: string; status?: string; page?: number; per_page?: number }) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
  return json<ApiStationMappingsResponse>(`${MAPPINGS_ROOT}?${query}`).then(normalizeStationMappingsResponse);
}

export const normalizeStationMappingsResponse = (response: ApiStationMappingsResponse): AnmsmMappingList => ({
  ok: response.ok,
  items: response.items.map(item => ({
    externalName: item.external_name,
    externalStationId: item.external_station_id,
    logo: item.logo ? { credit: item.logo.credit, title: item.logo.title, url: item.logo.url } : null,
    mapping: item.mapping,
    suggestions: item.suggestions
      .map(suggestion => ({
        matchType: suggestion.match_type,
        name: suggestion.name,
        score: suggestion.score,
        slug: suggestion.slug,
        stationId: suggestion.station_id,
      }))
      .sort((left, right) => right.score - left.score)
      .filter((suggestion, index) => index === 0 && (
        suggestion.matchType === "normalized_exact" || suggestion.score >= 70
      )),
  })),
  pagination: {
    page: response.pagination.page,
    totalPages: response.pagination.pages,
    perPage: response.pagination.per_page,
    total: response.pagination.total,
  },
  stats: {
    matched: response.stats.matched,
    received: response.stats.received,
    unmatched: response.stats.unmatched,
    withoutLogo: response.stats.without_logo,
  },
});

export function searchAnmsmResorts(query: string) {
  return json<{ items?: AnmsmResort[]; results?: AnmsmResort[] } | AnmsmResort[]>(`/api/admin/anmsm/resorts/search?q=${encodeURIComponent(query)}`);
}

const missingMappingId = (value: string | number) => String(value).trim() === "";

export function confirmAnmsmStationMappings(mappings: AnmsmMappingPayload[]) {
  const invalidMappings = mappings.filter(mapping =>
    missingMappingId(mapping.external_station_id) || missingMappingId(mapping.station_id)
  );
  if (invalidMappings.length > 0) {
    throw new Error(`${invalidMappings.length} correspondance(s) possèdent un identifiant manquant.`);
  }
  return post<AnmsmMappingResult>(`${MAPPINGS_ROOT}/confirm`, { mappings });
}

// This removes only the association. Station and published-logo deletion are never requested.
export const deleteAnmsmStationMapping = (anmsmStationId: string | number) => json<{ ok: boolean }>(`${MAPPINGS_ROOT}/${encodeURIComponent(anmsmStationId)}`, { method: "DELETE" });

export function selectAllAnmsmLogos(filters: AnmsmLogoFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page" && key !== "per_page") query.set(key, String(value));
  });
  return json<AnmsmSelection>(`${ROOT}/selection?${query}`);
}
