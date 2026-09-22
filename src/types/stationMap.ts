/** The deliberately small public contract returned by GET /api/stations/map. */
export type StationMapItem = {
  id: string | number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  logo?: string | null;
  department?: string | null;
  region?: string | null;
};

export function hasStationCoordinates(
  station: Partial<StationMapItem>,
): station is StationMapItem {
  return Number.isFinite(station.latitude) && Number.isFinite(station.longitude);
}
