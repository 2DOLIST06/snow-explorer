const firstDefined = (...values) => values.find((value) => value !== null && value !== undefined);
const { nonEmptyString, resolveStationPisteMap } = require("./stationPisteMap");

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
    pistes_small_map_url: nonEmptyString(resort.pistes_small_map_url) || nonEmptyString(widgets?.pistes?.smallMapUrl),
    pistes_large_map_url: nonEmptyString(resort.pistes_large_map_url) || nonEmptyString(widgets?.pistes?.largeMapUrl),
    pistes_caption: nonEmptyString(resort.pistes_caption) || nonEmptyString(widgets?.pistes?.caption),
  };
}

function normalizeAdminWidgets(rawWidgets = {}, resort = {}) {
  const widgets = { ...rawWidgets };
  const pistes = resolveStationPisteMap(resort, widgets.pistes || {});
  widgets.pistes = {
    ...(widgets.pistes || {}),
    enabled: pistes.enabled,
    smallMapUrl: pistes.smallMapUrl,
    largeMapUrl: pistes.largeMapUrl,
    // Keep editing the legacy fallback even while a published image makes it
    // irrelevant to the public rendering.
    officialMapUrl:
      nonEmptyString(widgets?.pistes?.officialMapUrl) ||
      nonEmptyString(widgets?.pistes?.official_map_url),
    caption: pistes.caption,
  };
  return widgets;
}

module.exports = { normalizeAdminStation, normalizeAdminWidgets };
