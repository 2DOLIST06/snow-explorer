import type { StationWidgetsConfig } from "@/types/station";

export const STATION_V2_SECTIONS = ["meteo-neige", "webcams", "forfaits", "plan-des-pistes"] as const;
export type StationV2Section = (typeof STATION_V2_SECTIONS)[number];
export type StationPageSection = "apercu" | StationV2Section;

export const SECTION_LABELS: Record<StationPageSection, string> = {
  apercu: "Aperçu",
  "meteo-neige": "Météo & neige",
  webcams: "Webcams",
  forfaits: "Forfaits",
  "plan-des-pistes": "Plan des pistes",
};

const API_KEYS: Record<StationV2Section, string[]> = {
  "meteo-neige": ["meteo_neige", "weather_snow", "meteo", "snow"],
  webcams: ["webcams"],
  forfaits: ["forfaits", "ski_passes"],
  "plan-des-pistes": ["plan_des_pistes", "piste_map", "pistes"],
};
const EDITORIAL_KEYS: Record<StationPageSection, string> = {
  apercu: "v2_overview_html", "meteo-neige": "v2_weather_snow_html", webcams: "v2_webcam_html",
  forfaits: "v2_ski_pass_html", "plan-des-pistes": "v2_piste_map_html",
};

export function isStationV2(station: any): boolean {
  return station?.page_layout_version === "v2";
}

export function getV2Root(station: any): any {
  return station?.v2 ?? station?.public_v2 ?? station?.v2_content ?? station?.v2_contents ?? {};
}

export function getV2Section(station: any, section: StationPageSection): any {
  const root = getV2Root(station);
  const keys = section === "apercu" ? ["apercu", "overview"] : API_KEYS[section];
  for (const key of keys) {
    const value = root?.sections?.[key] ?? root?.[key] ?? station?.[`v2_${key}`];
    if (value != null) return typeof value === "object" ? value : { content: value };
  }
  return {};
}

export function hasUsableWebcams(station: any, widgets?: StationWidgetsConfig | null): boolean {
  const section = getV2Section(station, "webcams");
  const sources = [section.items, section.webcams, station?.webcams, widgets?.webcams?.items];
  return sources.some((items) => Array.isArray(items) && items.some((item) => item && (item.iframeUrl || item.iframe_url || item.thumbUrl || item.thumb_url || item.image_url || item.pageUrl || item.page_url)));
}

export function isV2SectionPublished(station: any, section: StationV2Section, widgets?: StationWidgetsConfig | null): boolean {
  return isStationV2(station);
}

export function getV2Content(station: any, section: StationPageSection): string {
  const data = getV2Section(station, section);
  const value = station?.[EDITORIAL_KEYS[section]] ?? data.content_html ?? data.html ?? data.content ?? data.editorial_content ?? data.description;
  return typeof value === "string" ? value.trim() : "";
}

const nonEmptyArray = (value: unknown) => Array.isArray(value) && value.length > 0;
const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;

/** Public existence/indexation is based on useful content, never on navigation visibility. */
export function hasV2SectionData(station: any, section: StationV2Section, widgets?: StationWidgetsConfig | null): boolean {
  if (!isStationV2(station)) return false;
  const data = getV2Section(station, section);
  if (section === "meteo-neige") return Boolean(Number.isFinite(Number(station?.latitude)) && Number.isFinite(Number(station?.longitude))
    || hasText(data.summary) || hasText(data.updated_at) || hasText(data.observed_at)
    || (widgets?.meteo?.enabled && hasText(widgets.meteo.iframeUrl))
    || (widgets?.snow?.enabled && (hasText(widgets.snow.iframeUrl) || hasText(widgets.snow.openingDate) || hasText(widgets.snow.closingDate))));
  if (section === "webcams") return hasUsableWebcams(station, widgets) || (Number.isFinite(Number(station?.latitude)) && Number.isFinite(Number(station?.longitude)));
  if (section === "forfaits") return Boolean((widgets?.forfaits?.enabled && (nonEmptyArray(widgets.forfaits.items) || nonEmptyArray(widgets.forfaits.periods)))
    || (widgets?.normalizedForfaits?.enabled && nonEmptyArray(widgets.normalizedForfaits.periods)) || nonEmptyArray(data.items) || nonEmptyArray(data.periods));
  return [data.large_map_url, data.image_url, data.official_map_url, widgets?.pistes?.largeMapUrl, widgets?.pistes?.smallMapUrl,
    widgets?.pistes?.officialMapUrl, station?.pistes_large_map_url, station?.pistes_small_map_url, station?.pistes_official_map_url].some(hasText);
}

export function publishedV2Sections(station: any, widgets?: StationWidgetsConfig | null): StationV2Section[] {
  return isStationV2(station) ? [...STATION_V2_SECTIONS] : [];
}

export function sectionHref(slug: string, section: StationPageSection): string {
  const base = `/stations/${encodeURIComponent(slug)}`;
  return section === "apercu" ? base : `${base}/${section}`;
}

export function previewSectionHref(slug: string, section: StationPageSection): string {
  return `/admin/stations/${encodeURIComponent(slug)}/preview-v2?section=${section}`;
}

export function stationLocation(station: any): string {
  const department = typeof station?.department === "string" ? station.department : station?.department?.name;
  return [department, station?.region?.name ?? station?.region_name].filter(Boolean).join(", ");
}
