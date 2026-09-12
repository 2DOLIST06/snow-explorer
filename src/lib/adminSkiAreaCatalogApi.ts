import { adminFetch } from "@/lib/adminApi";
import type { CatalogExpectation, CatalogImport, CatalogPagination, CatalogPreview, ExpectationState } from "@/types/skiAreaCatalog";

async function catalogJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const details = Array.isArray(body?.details) ? ` — ${body.details.join(" ; ")}` : "";
    const error = new Error(`${body?.message || body?.error || `Erreur API (${response.status})`}${details}`) as Error & { status?: number; code?: string };
    error.status = response.status; error.code = body?.error; throw error;
  }
  return body as T;
}
const jsonPost = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });

export const previewSkiAreaCatalog = async () => (await catalogJson<{ preview: CatalogPreview }>(await adminFetch("/api/admin/ski-area-catalog/preview", jsonPost({})))).preview;
export const applySkiAreaCatalog = async (expected_sha256: string) => (await catalogJson<{ import: CatalogImport }>(await adminFetch("/api/admin/ski-area-catalog/imports", jsonPost({ expected_sha256 })))).import;
export const getSkiAreaCatalogImport = async (id: string) => (await catalogJson<{ import: CatalogImport }>(await adminFetch(`/api/admin/ski-area-catalog/imports/${encodeURIComponent(id)}`))).import;
export async function listCatalogExpectations(params: { page?: number; per_page?: number; q?: string; state?: ExpectationState | "" } = {}) {
  const query = new URLSearchParams({ page: String(params.page || 1), per_page: String(params.per_page || 25) });
  if (params.q?.trim()) query.set("q", params.q.trim()); if (params.state) query.set("state", params.state);
  return catalogJson<{ items: CatalogExpectation[]; pagination: CatalogPagination }>(await adminFetch(`/api/admin/ski-area-catalog/expectations?${query}`));
}
export const getCatalogExpectation = async (id: number) => (await catalogJson<{ expectation: CatalogExpectation }>(await adminFetch(`/api/admin/ski-area-catalog/expectations/${id}`))).expectation;
export const decideCatalogExpectation = async (id: number, payload: { decision: "confirm"; resort_id: string; note?: string } | { decision: "ignore"; note?: string }) => catalogJson<{ expectation: CatalogExpectation; memberships_linked: number }>(await adminFetch(`/api/admin/ski-area-catalog/expectations/${id}/decision`, jsonPost(payload)));
export const reconcileCatalog = async () => catalogJson<{ stations_scanned: number; proposals: unknown[]; linked_automatically: number }>(await adminFetch("/api/admin/ski-area-catalog/reconcile", jsonPost({})));
export const getStationExpectationCandidates = async (id: string) => catalogJson<{ station_id: string; items: Array<{ expectation: CatalogExpectation; confidence: "strong" | "ambiguous"; signals: string[]; automatic_link: false }> }>(await adminFetch(`/api/admin/ski-area-catalog/stations/${encodeURIComponent(id)}/candidates`));
