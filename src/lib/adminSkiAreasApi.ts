import { adminFetch, requireAdminResponse } from "@/lib/adminApi";
import type { Paginated, SkiAreaAdmin, SkiAreaWrite, StationOption } from "@/types/skiArea";

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Erreur API (${response.status})`) as Error & { status?: number; fields?: unknown };
    error.status = response.status; error.fields = body?.fields; throw error;
  }
  return body as T;
}

export async function listAdminSkiAreas(params: { page?: number; per_page?: number; q?: string; status?: string } = {}) {
  const query = new URLSearchParams();
  query.set("page", String(params.page || 1));
  query.set("per_page", String(params.per_page || 20));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status) query.set("status", params.status);
  return json<Paginated<SkiAreaAdmin>>(await adminFetch(`/api/admin/ski-areas?${query}`));
}

export async function getAdminSkiArea(id: number) {
  return json<{ ski_area: SkiAreaAdmin }>(await adminFetch(`/api/admin/ski-areas/${id}`));
}

export async function listActiveResorts() {
  const payload = await json<StationOption[] | { results?: StationOption[]; data?: StationOption[]; items?: StationOption[] }>(
    await adminFetch("/api/resorts/?active=true"),
  );
  if (Array.isArray(payload)) return payload;
  return payload.results || payload.data || payload.items || [];
}

export async function saveAdminSkiArea(id: number | null, payload: SkiAreaWrite) {
  const path = id === null ? "/api/admin/ski-areas" : `/api/admin/ski-areas/${id}`;
  return json<{ ski_area: SkiAreaAdmin }>(await requireAdminResponse(path, {
    method: id === null ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  }));
}

export async function setAdminSkiAreaPublication(id: number, published: boolean) {
  return json<{ ski_area: SkiAreaAdmin }>(await requireAdminResponse(`/api/admin/ski-areas/${id}/${published ? "publish" : "unpublish"}`, { method: "POST" }));
}

export async function listStationOptions(params: { page?: number; q?: string } = {}) {
  const query = new URLSearchParams({ page: String(params.page || 1), per_page: "50" });
  if (params.q?.trim()) query.set("q", params.q.trim());
  return json<Paginated<StationOption>>(await adminFetch(`/api/admin/ski-areas/station-options?${query}`));
}

export async function getStationSkiAreas(stationId: string) {
  return json<{ station: StationOption; ski_areas: SkiAreaAdmin[] }>(await adminFetch(`/api/admin/stations/${encodeURIComponent(stationId)}/ski-areas`));
}

export async function replaceStationSkiAreas(stationId: string, ids: number[]) {
  return json<{ station: StationOption; ski_areas: SkiAreaAdmin[] }>(await requireAdminResponse(`/api/admin/stations/${encodeURIComponent(stationId)}/ski-areas`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ski_area_ids: ids }),
  }));
}
