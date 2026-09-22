import { getServerApiBases, getSafeApiUrlForLogs } from "@/lib/api/resorts";
import type { StationMapItem } from "@/types/stationMap";
import { hasStationCoordinates } from "@/types/stationMap";

function parsePayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const value = payload as Record<string, unknown>;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.items)) return value.items;
  return [];
}

export function parseStationMapPayload(payload: unknown): StationMapItem[] {
  return parsePayload(payload).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    const station: Partial<StationMapItem> = {
      id: typeof value.id === "string" || typeof value.id === "number" ? value.id : undefined,
      name: typeof value.name === "string" ? value.name : undefined,
      slug: typeof value.slug === "string" ? value.slug : undefined,
      latitude: typeof value.latitude === "number" ? value.latitude : undefined,
      longitude: typeof value.longitude === "number" ? value.longitude : undefined,
      logo: typeof value.logo === "string" ? value.logo : null,
      department: typeof value.department === "string" ? value.department : null,
      region: typeof value.region === "string" ? value.region : null,
    };
    return station.id !== undefined && station.name && station.slug && hasStationCoordinates(station)
      ? [station as StationMapItem]
      : [];
  });
}

export async function fetchStationMapServer(): Promise<StationMapItem[]> {
  const failures: string[] = [];
  for (const base of getServerApiBases()) {
    const url = `${base}/api/stations/map`;
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) {
        failures.push(`${getSafeApiUrlForLogs(url)} returned ${response.status}`);
        continue;
      }
      return parseStationMapPayload(await response.json());
    } catch (error) {
      failures.push(`${getSafeApiUrlForLogs(url)} failed: ${error instanceof Error ? error.message : "unknown_error"}`);
    }
  }
  console.error("[station-map] Unable to fetch map stations", failures.join("; "));
  return [];
}
