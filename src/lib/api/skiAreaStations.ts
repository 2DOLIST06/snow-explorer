import { getStationApiBase, isResortInactive, resolveResortRegion } from "./stationPage";
import { getStationEditorialContent, getStationSectionData } from "../stationContent";
import type { StationOption } from "@/types/skiArea";

export type SkiAreaStation = StationOption & {
  latitude: number | null;
  longitude: number | null;
  department: string | { name?: string } | null;
  region: { name?: string } | null;
  v2_weather_snow_html: string | null;
  v2_webcam_html: string | null;
  v2: { weather_snow: { summary: string | null } };
};

// Membership comes exclusively from the public domain detail. The station
// detail is authoritative for current activity and the data used by its blocks.
export async function loadSkiAreaStations(members: StationOption[]): Promise<SkiAreaStation[]> {
  const unique = [...new Map(members.filter(station => station.is_active !== false && station.slug)
    .map(station => [station.slug, station])).values()];
  const stations: SkiAreaStation[] = [];
  // Bound concurrency even for large linked domains.
  for (let index = 0; index < unique.length; index += 6) {
    const batch = await Promise.all(unique.slice(index, index + 6).map(async member => {
      try {
        const response = await fetch(`${getStationApiBase()}/api/stations/${encodeURIComponent(member.slug)}`, {
          headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(4000),
        });
        if (!response.ok) return null;
        const station = resolveResortRegion(await response.json());
        if (!station || station.slug !== member.slug || typeof station.name !== "string" || isResortInactive(station)) return null;
        const summary = getStationSectionData(station, "meteo-neige").summary;
        return {
          ...member, name: station.name, is_active: true,
          latitude: station.latitude ?? null, longitude: station.longitude ?? null,
          department: typeof station.department === "string" ? station.department : station.department ? { name: station.department.name ?? "" } : null,
          region: station.region ? { name: station.region.name ?? "" } : null,
          logo_url: station.logo_url ?? member.logo_url ?? null,
          cover_image_url: station.cover_image_url ?? member.cover_image_url ?? null,
          v2_weather_snow_html: getStationEditorialContent(station, "meteo-neige") || null,
          v2_webcam_html: getStationEditorialContent(station, "webcams") || null,
          v2: { weather_snow: { summary: typeof summary === "string" ? summary : null } },
        } satisfies SkiAreaStation;
      } catch {
        console.error("[ski-area] linked station unavailable", member.slug);
        return null;
      }
    }));
    stations.push(...batch.filter((station): station is NonNullable<typeof station> => station !== null));
  }
  return stations;
}
