const firstDefined = (...values) => values.find((value) => value !== null && value !== undefined);

const sumDefinedNumbers = (values) => {
  const present = values.filter((value) => value !== null && value !== undefined && value !== "");
  if (present.length === 0) return undefined;
  return present.reduce((total, value) => total + Number(value || 0), 0);
};

/**
 * The public station page supports both the current resort fields and older
 * widget/API fields. Keep the admin form on the same contract so information
 * which is already displayed publicly is not reported as missing.
 */
function normalizeAdminStation(resort = {}, widgets = {}) {
  const colors = widgets?.pistes?.colors || {};
  const lifts = widgets?.remontees || {};

  return {
    ...resort,
    region_id: firstDefined(resort.region_id, resort.region?.id, null),
    department: firstDefined(resort.department, null),
    altitude_min_m: firstDefined(resort.altitude_min_m, resort.altitude_base_m, null),
    altitude_max_m: firstDefined(resort.altitude_max_m, resort.altitude_top_m, null),
    season_open_date: firstDefined(
      resort.season_open_date,
      widgets?.snow?.season?.openingDate,
      widgets?.snow?.openingDate,
      null
    ),
    season_close_date: firstDefined(
      resort.season_close_date,
      widgets?.snow?.season?.closingDate,
      widgets?.snow?.closingDate,
      null
    ),
    pistes_count: firstDefined(
      resort.pistes_count,
      sumDefinedNumbers([colors.green, colors.blue, colors.red, colors.black]),
      null
    ),
    ski_area_km: firstDefined(resort.ski_area_km, null),
    lifts_count: firstDefined(
      resort.lifts_count,
      sumDefinedNumbers([lifts.tireFesses, lifts.telesieges, lifts.telepheriques]),
      null
    ),
    pistes_small_map_url: firstDefined(resort.pistes_small_map_url, widgets?.pistes?.smallMapUrl, null),
    pistes_large_map_url: firstDefined(resort.pistes_large_map_url, widgets?.pistes?.largeMapUrl, null),
  };
}

function normalizeAdminWidgets(rawWidgets = {}, resort = {}) {
  const widgets = { ...rawWidgets };
  widgets.pistes = {
    ...(widgets.pistes || {}),
    smallMapUrl: firstDefined(widgets?.pistes?.smallMapUrl, resort.pistes_small_map_url, null),
    largeMapUrl: firstDefined(widgets?.pistes?.largeMapUrl, resort.pistes_large_map_url, null),
  };
  return widgets;
}

module.exports = { normalizeAdminStation, normalizeAdminWidgets };
