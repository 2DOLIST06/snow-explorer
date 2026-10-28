// Creation batches only. Missing values exclude the whole station; zero is valid.
const STATION_FIELDS = ["name", "slug", "country_code", "website_url", "latitude", "longitude",
  "altitude_min_m", "altitude_max_m", "ski_area_km", "pistes_count", "lifts_count",
  "season_open_date", "season_close_date", "description_md"];
const BLOCKS = { pistes: ["green", "blue", "red", "black"],
  remontees: ["tire_fesses", "telesieges", "telepheriques"], snowpark: ["count"] };
const missing = value => value === undefined || value === null || (typeof value === "string" && !value.trim());

function completeStationBatch(input) {
  if (!input || input.batch_version !== "1.0" || !Array.isArray(input.document?.stations) || !Array.isArray(input.media)) {
    throw new Error("Le lot doit contenir document.stations et media.");
  }
  const excluded = [];
  const stations = input.document.stations.filter(record => {
    const station = record.station || {};
    const nordicOnly = [record.nordique?.ski_area_km, record.nordique?.pistes_count, record.nordique?.classic_km, record.nordique?.skating_km].some(value => Number(value) > 0)
      && ![station.ski_area_km, station.pistes_count, station.lifts_count].some(value => Number(value) > 0);
    const fields = STATION_FIELDS.filter(key => !(nordicOnly && ["ski_area_km", "pistes_count", "lifts_count"].includes(key)) && missing(station[key])).map(key => `station.${key}`);
    if (missing(station.region_id) && missing(station.region_name)) fields.push("station.region");
    if (station.country_code === "FR" && missing(station.department)) fields.push("station.department");
    for (const [block, keys] of Object.entries(nordicOnly ? {} : BLOCKS)) {
      for (const key of keys) if (missing(record[block]?.[key])) fields.push(`${block}.${key}`);
    }
    const seasons = record.forfaits_avances?.seasons;
    const season = Array.isArray(seasons) && seasons.find(item => item.season === input.scope?.season);
    if (!season || !season.periods?.length || !season.passes?.length ||
        season.passes.some(pass => !Array.isArray(pass.prices) || !pass.prices.length)) fields.push("forfaits_avances.seasons");
    for (const role of ["cover", "logo", "piste_map"]) {
      const asset = input.media.find(item => item.station_slug === station.slug && item.role === role);
      if (!asset || asset.status !== "found" || missing(asset.source_kind === "generated" ? asset.data_base64 : asset.source_url)) fields.push(`media.${role}`);
    }
    if (!fields.length) return true;
    excluded.push({ slug: station.slug || "sans-slug", name: station.name || station.slug || "Station inconnue", fields });
    return false;
  });
  const slugs = new Set(stations.map(record => record.station.slug));
  return { batch: { ...input, document: { ...input.document, stations },
    media: input.media.filter(asset => slugs.has(asset.station_slug)),
    research: Array.isArray(input.research) ? input.research.filter(row => slugs.has(row.station_slug)) : input.research }, excluded };
}

module.exports = { completeStationBatch };
