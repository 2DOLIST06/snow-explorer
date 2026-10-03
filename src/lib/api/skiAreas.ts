import { getServerApiBase } from "@/lib/api/resorts";
import type { Paginated, SkiAreaPublic } from "@/types/skiArea";

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message || body?.error || `Erreur API (${response.status})`;
    const error = new Error(message) as Error & { status?: number; fields?: unknown };
    error.status = response.status;
    error.fields = body?.fields;
    throw error;
  }
  return body as T;
}

export async function fetchPublicSkiAreasPage(page = 1, perPage = 100) {
  const response = await fetch(`${getServerApiBase()}/api/ski-areas?page=${page}&per_page=${perPage}`, { headers: { Accept: "application/json" } });
  return json<Paginated<SkiAreaPublic>>(response);
}

export async function fetchAllPublicSkiAreas(): Promise<SkiAreaPublic[]> {
  const first = await fetchPublicSkiAreasPage(1, 100);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.pagination.pages - 1) }, (_, index) => fetchPublicSkiAreasPage(index + 2, 100)));
  return [first, ...rest].flatMap(page => page.items).filter(area => area.status === "published");
}

/**
 * The ski-area list is intentionally lightweight and does not necessarily
 * include its stations. Load each detail resource so consumers that need the
 * ski_area_resort memberships receive the associated resort IDs.
 */
export async function fetchAllPublicSkiAreasWithStations(): Promise<SkiAreaPublic[]> {
  const areas = await fetchAllPublicSkiAreas();
  return Promise.all(areas.map(async area => (await fetchPublicSkiArea(area.slug)) || area));
}

export async function fetchPublicSkiArea(slug: string) {
  const response = await fetch(`${getServerApiBase()}/api/ski-areas/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  const data = await json<{ ski_area: SkiAreaPublic }>(response);
  return data.ski_area.status === "published" ? data.ski_area : null;
}
