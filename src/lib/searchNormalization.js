/**
 * Produces a compact comparison key for user-facing station searches.
 * Accents, casing and separators (spaces, hyphens, apostrophes, etc.) are
 * intentionally ignored so users do not have to know the exact spelling.
 */
export function normalizeSearchText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("fr")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function matchesSearch(value, query) {
  return normalizeSearchText(value).includes(normalizeSearchText(query));
}

/**
 * Return every matching station: scrolling must never hide later matches.
 * @template {{name?: string, slug?: string, region?: {name?: string}, department?: {name?: string}}} T
 * @param {T[]} stations
 * @param {string} query
 * @returns {T[]}
 */
export function filterStations(stations, query) {
  return stations.filter((station) => matchesSearch(
    `${station.name || ""} ${station.slug || ""} ${station.region?.name || ""} ${station.department?.name || ""}`,
    query,
  )).sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
}
