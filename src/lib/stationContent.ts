export const STATION_SECTIONS = ["meteo-neige", "webcams", "forfaits", "plan-des-pistes"] as const;
export type StationDetailSection = (typeof STATION_SECTIONS)[number];
export type StationPageSection = "apercu" | StationDetailSection;

export const SECTION_LABELS: Record<StationPageSection, string> = {
  apercu: "Aperçu",
  "meteo-neige": "Météo & neige",
  webcams: "Webcams",
  forfaits: "Forfaits",
  "plan-des-pistes": "Plan des pistes",
};

const API_KEYS: Record<StationDetailSection, string[]> = {
  "meteo-neige": ["meteo_neige", "weather_snow", "meteo", "snow"],
  webcams: ["webcams"],
  forfaits: ["forfaits", "ski_passes"],
  "plan-des-pistes": ["plan_des_pistes", "piste_map", "pistes"],
};
const EDITORIAL_KEYS: Record<StationPageSection, string> = {
  apercu: "v2_overview_html",
  "meteo-neige": "v2_weather_snow_html",
  webcams: "v2_webcam_html",
  forfaits: "v2_ski_pass_html",
  "plan-des-pistes": "v2_piste_map_html",
};

function stationContentRoot(station: any): any {
  return station?.v2 ?? station?.public_v2 ?? station?.v2_content ?? station?.v2_contents ?? {};
}

export function getStationSectionData(station: any, section: StationPageSection): any {
  const root = stationContentRoot(station);
  const keys = section === "apercu" ? ["apercu", "overview"] : API_KEYS[section];
  for (const key of keys) {
    const value = root?.sections?.[key] ?? root?.[key] ?? station?.[`v2_${key}`];
    if (value != null) return typeof value === "object" ? value : { content: value };
  }
  return {};
}

export function getStationEditorialContent(station: any, section: StationPageSection): string {
  const data = getStationSectionData(station, section);
  const value = station?.[EDITORIAL_KEYS[section]] ?? data.content_html ?? data.html ?? data.content ?? data.editorial_content ?? data.description;
  return typeof value === "string" ? value.trim() : "";
}

export function stationLocation(station: any): string {
  const department = typeof station?.department === "string" ? station.department : station?.department?.name;
  return [department, station?.region?.name ?? station?.region_name].filter(Boolean).join(", ");
}
