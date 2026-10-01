type DirectoryStation = {
  id: string;
  slug: string;
  department?: unknown;
  region?: { name?: string } | null;
};

type DirectorySkiArea = {
  slug: string;
  stations?: Array<{ id?: string | null }>;
};

export function getStationDepartment(station: DirectoryStation): string | null {
  return typeof station.department === "string" && station.department.trim()
    ? station.department
    : null;
}

export function getDepartmentOptions(stations: DirectoryStation[], selectedRegion: string): string[] {
  const stationsForDepartmentOptions = selectedRegion
    ? stations.filter((station) => station.region?.name === selectedRegion)
    : stations;

  return [...new Set(
    stationsForDepartmentOptions
      .map((station) => getStationDepartment(station))
      .filter((department): department is string => Boolean(department)),
  )].sort((a, b) => a.localeCompare(b, "fr"));
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
