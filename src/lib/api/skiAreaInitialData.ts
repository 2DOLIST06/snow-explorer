import { loadStationInitialData, type StationInitialData } from "./stationInitialData";
import { getStationApiBase } from "./stationPage";
import { normalizeAvalancheRisk } from "./avalanche";
import type { SkiAreaStation } from "./skiAreaStations";

export async function loadSkiAreaInitialData(stations: SkiAreaStation[]): Promise<Record<string, StationInitialData>> {
  const result: Record<string, StationInitialData> = {};
  for (let index = 0; index < stations.length; index += 6) {
    await Promise.all(stations.slice(index, index + 6).map(async station => {
      const avalanche = fetch(`${getStationApiBase()}/api/stations/${encodeURIComponent(station.slug)}/avalanche-risk`, {
        headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(2500),
      }).then(async response => {
        if (!response.ok) return null;
        const data = normalizeAvalancheRisk(await response.json());
        return data.station.slug === station.slug ? data : null;
      }).catch(() => null);
      const [initial, bulletin] = await Promise.all([loadStationInitialData(station), avalanche]);
      result[station.slug] = { ...initial, avalanche: bulletin };
    }));
  }
  return result;
}
