const nonEmptyText = (value) => typeof value === "string" && value.trim() ? value.trim() : "";

/**
 * Keep the V3 presentation on the same source contract as the legacy page:
 * the resort description is authoritative and the legacy widget description
 * remains its fallback. V2 editorial content is intentionally handled apart.
 */
function getStationPresentation(station = {}, widgets = null) {
  const presentation = nonEmptyText(station.description_md) || nonEmptyText(widgets?.description?.html);
  return presentation
    ? presentation.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
}

/** Return only real, strictly positive piste counts, in display order. */
function getStationPisteDetails(station = {}, widgets = null) {
  const colors = station.pistes_colors ?? widgets?.pistes?.colors ?? {};
  return [
    { label: "Vertes", value: colors.green, color: "green" },
    { label: "Bleues", value: colors.blue, color: "blue" },
    { label: "Rouges", value: colors.red, color: "red" },
    { label: "Noires", value: colors.black, color: "black" },
  ].filter(({ value }) => Number.isFinite(Number(value)) && Number(value) > 0);
}

/** Resolve the statistics contract used by the legacy Station / ski-area switch. */
function getStationOverviewScope(station = {}, widgets = null, skiArea = null) {
  if (skiArea) {
    const elevationDrop = Number.isFinite(skiArea.altitude_min_m) && Number.isFinite(skiArea.altitude_max_m)
      ? skiArea.altitude_max_m - skiArea.altitude_min_m
      : null;
    return {
      altitudeMin: skiArea.altitude_min_m, altitudeMax: skiArea.altitude_max_m, elevationDrop,
      skiAreaKm: skiArea.ski_area_km, pistesCount: skiArea.pistes_count, liftsCount: skiArea.lifts_count,
      snowparksCount: skiArea.snowparks_count, openDate: skiArea.forecast_open_date, closeDate: skiArea.forecast_close_date,
      pistes: [
        { label: "Vertes", value: skiArea.green_pistes_count, color: "green" },
        { label: "Bleues", value: skiArea.blue_pistes_count, color: "blue" },
        { label: "Rouges", value: skiArea.red_pistes_count, color: "red" },
        { label: "Noires", value: skiArea.black_pistes_count, color: "black" },
      ].filter(({ value }) => Number.isFinite(Number(value)) && Number(value) > 0),
    };
  }
  return {
    altitudeMin: station.altitude_min_m ?? station.altitude_base_m ?? null,
    altitudeMax: station.altitude_max_m ?? station.altitude_top_m ?? null,
    elevationDrop: station.elevation_drop_m ?? station.vertical_drop_m ?? null,
    skiAreaKm: station.ski_area_km, pistesCount: station.pistes_count, liftsCount: station.lifts_count,
    snowparksCount: station.snowparks_count ?? widgets?.snowparks?.count,
    openDate: station.season_open_date ?? widgets?.snow?.season?.openingDate ?? widgets?.snow?.openingDate ?? null,
    closeDate: station.season_close_date ?? widgets?.snow?.season?.closingDate ?? widgets?.snow?.closingDate ?? null,
    pistes: getStationPisteDetails(station, widgets),
  };
}

module.exports = { getStationPresentation, getStationPisteDetails, getStationOverviewScope };
