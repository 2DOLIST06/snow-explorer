type DirectoryStation = {
  id: string;
  slug: string;
  department?: string | { name?: string } | null;
  region?: { name?: string } | null;
};

type DirectorySkiArea = {
  slug: string;
  stations?: Array<{ id?: string | null }>;
};

export function getSkiAreaOptions<T extends DirectorySkiArea>(
  skiAreas: T[],
  stations: DirectoryStation[],
  selectedRegion: string,
  selectedDepartment = "",
): T[] {
  if (!selectedRegion && !selectedDepartment) return skiAreas;

  const matchingStationIds = new Set(
    stations
      .filter((station) => matchesStationLocation(station, selectedRegion, selectedDepartment))
      .map((station) => station.id),
  );

  return skiAreas.filter((area) =>
    (area.stations || []).some((station) => station.id ? matchingStationIds.has(station.id) : false),
  );
}

export function getStationDepartment(station: DirectoryStation): string | null {
  const department = typeof station.department === "string"
    ? station.department
    : station.department?.name;
  return department?.trim() || null;
}

export function getDepartmentOptions(stations: DirectoryStation[], selectedRegion = ""): string[] {
  return [...new Set(
    stations
      .filter((station) => !selectedRegion || station.region?.name === selectedRegion)
      .map((station) => getStationDepartment(station))
      .filter((department): department is string => Boolean(department)),
  )].sort((a, b) => a.localeCompare(b, "fr"));
}

export function matchesStationLocation(
  station: DirectoryStation,
  selectedRegion: string,
  selectedDepartment: string,
): boolean {
  return (!selectedRegion || station.region?.name === selectedRegion)
    && (!selectedDepartment || getStationDepartment(station) === selectedDepartment);
}

export function getDepartmentRegion(
  stations: DirectoryStation[],
  selectedDepartment: string,
  currentRegion = "",
): string | null {
  if (!selectedDepartment) return null;
  const departmentStations = stations.filter((station) => getStationDepartment(station) === selectedDepartment);
  if (departmentStations.some((station) => !station.region?.name)) return null;
  const regions = [...new Set(
    departmentStations
      .map((station) => station.region?.name)
      .filter((name): name is string => Boolean(name)),
  )];
  if (currentRegion && regions.includes(currentRegion)) return currentRegion;
  return regions.length === 1 ? regions[0] : null;
}

export function getSkiAreaLocation(
  skiAreas: DirectorySkiArea[],
  stations: DirectoryStation[],
  selectedSkiAreaSlug: string,
): { region: string | null; department: string | null } {
  const selectedArea = skiAreas.find((area) => area.slug === selectedSkiAreaSlug);
  const stationRefs = selectedArea?.stations || [];
  const stationIds = getSkiAreaStationIds(skiAreas, selectedSkiAreaSlug);
  if (!stationIds || stationIds.size !== stationRefs.length) return { region: null, department: null };

  const areaStations = stations.filter((station) => stationIds.has(station.id));
  if (areaStations.length !== stationIds.size) return { region: null, department: null };
  const regions = [...new Set(areaStations.map((station) => station.region?.name).filter((name): name is string => Boolean(name)))];
  const departments = [...new Set(areaStations.map(getStationDepartment).filter((name): name is string => Boolean(name)))];
  return {
    region: regions.length === 1 && areaStations.every((station) => station.region?.name) ? regions[0] : null,
    department: departments.length === 1 && areaStations.every((station) => getStationDepartment(station)) ? departments[0] : null,
  };
}

export function getSkiAreaStationIds(
  skiAreas: DirectorySkiArea[],
  selectedSkiAreaSlug: string,
): Set<string> | null {
  if (!selectedSkiAreaSlug) return null;

  const selectedSkiArea = skiAreas.find((area) => area.slug === selectedSkiAreaSlug);
  return new Set(
    (selectedSkiArea?.stations || [])
      .map((station) => station.id)
      .filter((id): id is string => Boolean(id)),
  );
}
