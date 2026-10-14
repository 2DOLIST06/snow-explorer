import { getSafeApiUrlForLogs, getServerApiBases } from "@/lib/api/resorts";
import type { RegionSummary } from "@/lib/regions";

const REGIONS_PATH = "/api/regions";

export function parseRegionsPayload(payload: unknown): RegionSummary[] {
  if (Array.isArray(payload)) return payload as RegionSummary[];
  if (!payload || typeof payload !== "object") return [];

  const objectPayload = payload as Record<string, unknown>;
  const candidates = Array.isArray(objectPayload.items)
    ? objectPayload.items
    : Array.isArray(objectPayload.results)
      ? objectPayload.results
      : Array.isArray(objectPayload.data)
        ? objectPayload.data
        : [];

  return candidates as RegionSummary[];
}

/** Fetch the public region directory using the same server configuration as resorts. */
export async function fetchRegionsServer(): Promise<RegionSummary[]> {
  const failures: string[] = [];

  for (const base of getServerApiBases()) {
    const url = `${base}${REGIONS_PATH}`;
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) {
        failures.push(`${getSafeApiUrlForLogs(url)} returned ${response.status}`);
        continue;
      }
      return parseRegionsPayload(await response.json());
    } catch (error) {
      failures.push(
        `${getSafeApiUrlForLogs(url)} failed: ${error instanceof Error ? error.message : "unknown_error"}`,
      );
    }
  }

  console.error("[regions] Unable to fetch the public region directory", failures.join("; "));
  return [];
}

/** Detail is the SEO source: directory/embedded records can omit these fields. */
export async function fetchRegionDetailServer(id: string): Promise<RegionSummary | null> {
  for (const base of getServerApiBases()) {
    try {
      const response = await fetch(`${base}/api/regions/${encodeURIComponent(id)}`, { headers: { accept: "application/json" } });
      if (!response.ok) continue;
      const payload = await response.json();
      const region = payload?.region || payload?.data || payload;
      if (region && typeof region === "object" && !Array.isArray(region)) return region as RegionSummary;
    } catch { /* Try the next configured backend. */ }
  }
  console.error("[regions] Unable to fetch region SEO detail", id);
  return null;
}
