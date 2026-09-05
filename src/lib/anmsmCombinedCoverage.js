/**
 * Backend contract for the combined ANMSM logo/piste-map coverage view.
 *
 * This module deliberately has no UI dependency.  Callers must provide the
 * latest complete catalogue; duplicate catalogue records are collapsed here
 * by external station id before mappings and resource state are joined.
 */

const CASE_LABELS = Object.freeze({
  both_available_all: "Logo et plan disponibles chez ANMSM",
  both_available_mapped: "Logo et plan disponibles — station Snow Explorer associée",
  both_available_unmapped: "Logo et plan disponibles — aucune station Snow Explorer associée",
  both_available_both_published: "Logo et plan ANMSM publiés",
  both_available_neither_published: "Logo et plan ANMSM non publiés",
  both_available_only_logo_published: "Logo publié — plan non publié",
  both_available_only_piste_map_published: "Plan publié — logo non publié",
  only_logo_available_confirmed: "Logo disponible — aucun plan fourni par ANMSM",
  only_piste_map_available_confirmed: "Plan disponible — aucun logo fourni par ANMSM",
  neither_available_confirmed: "Ni logo ni plan fournis par ANMSM",
  combined_availability_unknown: "Disponibilité du logo ou du plan inconnue",
  snow_explorer_has_both: "Logo et plan présents sur Snow Explorer",
  snow_explorer_has_neither: "Ni logo ni plan présents sur Snow Explorer",
  snow_explorer_has_only_logo: "Logo présent — plan absent",
  snow_explorer_has_only_piste_map: "Plan présent — logo absent",
  snow_explorer_without_verified_anmsm_mapping: "Stations Snow Explorer sans association ANMSM",
  anmsm_without_snow_explorer_mapping: "Stations ANMSM sans station Snow Explorer associée",
  mapped_stations: "Stations Snow Explorer associées à ANMSM",
  request_logo_only: "Logo à demander à la station",
  request_piste_map_only: "Plan à demander à la station",
  request_both: "Logo et plan à demander à la station",
  request_none: "Aucune demande à effectuer",
  logo_or_piste_map_to_retrieve: "Logo ou plan à récupérer",
  logo_or_piste_map_to_prepare: "Logo ou plan à préparer",
  logo_or_piste_map_to_review: "Logo ou plan à vérifier",
  logo_and_piste_map_to_retrieve: "Logo et plan à récupérer",
  logo_and_piste_map_to_prepare: "Logo et plan à préparer",
  logo_and_piste_map_to_review: "Logo et plan à vérifier",
  logo_or_piste_map_error: "Erreur sur le logo ou le plan",
});

const nonEmpty = value => typeof value === "string" && value.trim().length > 0;
const availability = (value, complete) => value === true ? true : value === false && complete === true ? false : null;
const latestFirst = (a, b) => String(b.observed_at || b.snapshot_at || "").localeCompare(String(a.observed_at || a.snapshot_at || ""));

function deduplicateSnapshots(snapshots) {
  const result = new Map();
  [...snapshots].sort(latestFirst).forEach(snapshot => {
    const id = String(snapshot.external_station_id || "");
    if (id && !result.has(id)) result.set(id, snapshot);
  });
  return result;
}

function approvedPublication(candidates, stationId, externalId, currentUrl) {
  if (!nonEmpty(currentUrl)) return false;
  return candidates.some(candidate =>
    candidate.status === "approved" &&
    String(candidate.station_id) === String(stationId) &&
    String(candidate.external_station_id) === String(externalId) &&
    [candidate.published_url, candidate.published_key, candidate.url, candidate.key].some(value => nonEmpty(value) && value === currentUrl)
  );
}

function workflowActions(row) {
  const verbs = { available_not_imported: "retrieve", to_prepare: "prepare", ready_to_review: "review", error: "error" };
  return ["logo", "piste_map"].flatMap(kind => verbs[row[`${kind}_workflow_status`]] ? [{ resource: kind, action: verbs[row[`${kind}_workflow_status`]] }] : []);
}

function categories(row) {
  const cases = new Set();
  const logo = row.anmsm_logo_available, map = row.anmsm_piste_map_available;
  if (logo === true && map === true) {
    cases.add("both_available_all");
    cases.add(row.mapping_verified ? "both_available_mapped" : "both_available_unmapped");
    if (row.mapping_verified) {
      cases.add(row.anmsm_logo_published
        ? row.anmsm_piste_map_published ? "both_available_both_published" : "both_available_only_logo_published"
        : row.anmsm_piste_map_published ? "both_available_only_piste_map_published" : "both_available_neither_published");
    }
  } else if (logo === true && map === false) cases.add("only_logo_available_confirmed");
  else if (logo === false && map === true) cases.add("only_piste_map_available_confirmed");
  else if (logo === false && map === false) cases.add("neither_available_confirmed");
  else if (logo === null || map === null) cases.add("combined_availability_unknown");

  if (row.station_id != null) {
    const hasLogo = nonEmpty(row.snow_explorer_logo_url), hasMap = nonEmpty(row.snow_explorer_piste_map_url);
    cases.add(hasLogo ? hasMap ? "snow_explorer_has_both" : "snow_explorer_has_only_logo" : hasMap ? "snow_explorer_has_only_piste_map" : "snow_explorer_has_neither");
    cases.add(row.mapping_verified ? "mapped_stations" : "snow_explorer_without_verified_anmsm_mapping");
    const needsLogo = !hasLogo && logo === false, needsMap = !hasMap && map === false;
    cases.add(needsLogo ? needsMap ? "request_both" : "request_logo_only" : needsMap ? "request_piste_map_only" : "request_none");
  }
  if (row.anmsm_external_station_id && !row.mapping_verified) cases.add("anmsm_without_snow_explorer_mapping");

  const statuses = [row.logo_workflow_status, row.piste_map_workflow_status];
  for (const [status, either, both] of [
    ["available_not_imported", "logo_or_piste_map_to_retrieve", "logo_and_piste_map_to_retrieve"],
    ["to_prepare", "logo_or_piste_map_to_prepare", "logo_and_piste_map_to_prepare"],
    ["ready_to_review", "logo_or_piste_map_to_review", "logo_and_piste_map_to_review"],
  ]) if (statuses.includes(status)) { cases.add(either); if (statuses.every(value => value === status)) cases.add(both); }
  if (statuses.includes("error") || row.logo_error || row.piste_map_error) cases.add("logo_or_piste_map_error");
  return cases;
}

function buildRows(input) {
  const snapshots = deduplicateSnapshots(input.anmsm_snapshots || []);
  const stations = new Map((input.snow_explorer_stations || []).map(station => [String(station.station_id), station]));
  const mappings = new Map((input.mappings || []).filter(mapping => mapping.verified === true).map(mapping => [String(mapping.external_station_id), mapping]));
  const mappedStationIds = new Set();
  const rows = [...snapshots].map(([externalId, snapshot]) => {
    const mapping = mappings.get(externalId), station = mapping && stations.get(String(mapping.station_id));
    if (station) mappedStationIds.add(String(station.station_id));
    const stationId = station?.station_id ?? null;
    const currentLogo = station?.logo_url ?? null, currentMap = station?.piste_map_url ?? station?.map_url ?? null;
    const row = {
      anmsm_external_station_id: externalId, anmsm_station_name: snapshot.station_name || null,
      station_id: stationId, station_name: station?.station_name ?? null, mapping_verified: !!station,
      anmsm_logo_available: availability(snapshot.logo_available, snapshot.logo_observation_complete), anmsm_logo_url: snapshot.logo_url ?? null,
      anmsm_piste_map_available: availability(snapshot.piste_map_available, snapshot.piste_map_observation_complete), anmsm_piste_map_url: snapshot.piste_map_url ?? null,
      snow_explorer_logo_url: currentLogo, snow_explorer_piste_map_url: currentMap,
      anmsm_logo_published: approvedPublication(input.logo_candidates || [], stationId, externalId, currentLogo),
      anmsm_piste_map_published: approvedPublication(input.piste_map_candidates || [], stationId, externalId, currentMap),
      logo_workflow_status: snapshot.logo_workflow_status ?? "unknown", piste_map_workflow_status: snapshot.piste_map_workflow_status ?? "unknown",
      logo_error: snapshot.logo_error ?? null, piste_map_error: snapshot.piste_map_error ?? null, missing_resource_types: [],
    };
    if (stationId != null && !nonEmpty(currentLogo)) row.missing_resource_types.push("logo");
    if (stationId != null && !nonEmpty(currentMap)) row.missing_resource_types.push("piste_map");
    row.workflow_actions = workflowActions(row);
    return row;
  });
  for (const station of stations.values()) if (!mappedStationIds.has(String(station.station_id))) {
    const row = { anmsm_external_station_id: null, anmsm_station_name: null, station_id: station.station_id, station_name: station.station_name,
      mapping_verified: false, anmsm_logo_available: null, anmsm_logo_url: null, anmsm_piste_map_available: null, anmsm_piste_map_url: null,
      snow_explorer_logo_url: station.logo_url ?? null, snow_explorer_piste_map_url: station.piste_map_url ?? station.map_url ?? null,
      anmsm_logo_published: false, anmsm_piste_map_published: false, logo_workflow_status: "unknown", piste_map_workflow_status: "unknown",
      logo_error: null, piste_map_error: null, missing_resource_types: [], workflow_actions: [] };
    if (!nonEmpty(row.snow_explorer_logo_url)) row.missing_resource_types.push("logo");
    if (!nonEmpty(row.snow_explorer_piste_map_url)) row.missing_resource_types.push("piste_map");
    rows.push(row);
  }
  return rows.map(row => Object.assign(row, { cases: [...categories(row)] }));
}

function getCombinedCoverage(input, query = {}) {
  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
  const pageSize = Number.isInteger(query.page_size) && query.page_size > 0 ? query.page_size : 25;
  const needle = String(query.search || "").trim().toLocaleLowerCase("fr");
  const allRows = buildRows(input).filter(row => !needle || [row.station_name, row.anmsm_station_name].some(name => String(name || "").toLocaleLowerCase("fr").includes(needle)));
  allRows.sort((a, b) => String(a.station_name || a.anmsm_station_name || "").localeCompare(String(b.station_name || b.anmsm_station_name || ""), "fr"));
  const counts = Object.fromEntries(Object.keys(CASE_LABELS).map(key => [key, allRows.filter(row => row.cases.includes(key)).length]));
  const selected = query.case ? allRows.filter(row => row.cases.includes(query.case)) : allRows;
  const total = selected.length, offset = (page - 1) * pageSize;
  return { ok: true, resource: "combined", case: query.case ?? null, counts, case_labels: CASE_LABELS,
    rows: selected.slice(offset, offset + pageSize), pagination: { page, page_size: pageSize, total, total_pages: total ? Math.ceil(total / pageSize) : 0 } };
}

module.exports = { CASE_LABELS, buildCombinedCoverageRows: buildRows, getCombinedCoverage };
