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

function explicitPublication(value: any): boolean | null {
  if (typeof value?.published === "boolean") return value.published;
  if (typeof value?.is_published === "boolean") return value.is_published;
  if (typeof value?.enabled === "boolean") return value.enabled;
  if (value?.status) return value.status === "published" || value.status === "ready";
  return null;
}

export function hasUsableWebcams(station: any, widgets?: StationWidgetsConfig | null): boolean {
  const section = getV2Section(station, "webcams");
  const items = section.items ?? section.webcams ?? station?.webcams ?? widgets?.webcams?.items;
  return Array.isArray(items) && items.some((item) => item && (item.iframeUrl || item.iframe_url || item.thumbUrl || item.thumb_url || item.image_url || item.pageUrl || item.page_url));
}

export function isV2SectionPublished(station: any, section: StationV2Section, widgets?: StationWidgetsConfig | null): boolean {
  if (!isStationV2(station)) return false;
  const data = getV2Section(station, section);
  const root = getV2Root(station);
  const publication = explicitPublication(data);
  let published = publication ?? false;
  const publicationMap = root?.published_sections ?? root?.sections_published ?? station?.v2_published_sections;
  if (Array.isArray(publicationMap)) published = publicationMap.includes(section) || API_KEYS[section].some((key) => publicationMap.includes(key));
  else if (publicationMap && typeof publicationMap === "object") {
    const mapped = publicationMap[section] ?? API_KEYS[section].map((key) => publicationMap[key]).find((value) => typeof value === "boolean");
    if (typeof mapped === "boolean") published = mapped;
  }
  if (section === "webcams") return published && hasUsableWebcams(station, widgets);
  return published;
}

export function getV2Content(station: any, section: StationPageSection): string {
  const data = getV2Section(station, section);
  const value = data.content_html ?? data.html ?? data.content ?? data.editorial_content ?? data.description;
  return typeof value === "string" ? value.trim() : "";
}

export function publishedV2Sections(station: any, widgets?: StationWidgetsConfig | null): StationV2Section[] {
  return STATION_V2_SECTIONS.filter((section) => isV2SectionPublished(station, section, widgets));
}

export function sectionHref(slug: string, section: StationPageSection): string {
  const base = `/stations/${encodeURIComponent(slug)}`;
  return section === "apercu" ? base : `${base}/${section}`;
}

export function stationLocation(station: any): string {
  const department = typeof station?.department === "string" ? station.department : station?.department?.name;
  return [department, station?.region?.name ?? station?.region_name].filter(Boolean).join(", ");
}
