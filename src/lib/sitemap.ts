import type { Resort } from "@/lib/api/resorts";
import { regionSlug, type RegionSummary } from "@/lib/regions";
import type { SkiAreaPublic } from "@/types/skiArea";

const V2_SECTION_KEYS = {
  "meteo-neige": ["meteo_neige", "weather_snow", "meteo", "snow"],
  webcams: ["webcams"],
  forfaits: ["forfaits", "ski_passes"],
  "plan-des-pistes": ["plan_des_pistes", "piste_map", "pistes"],
} as const;

function sitemapV2Sections(resort: Resort): Array<keyof typeof V2_SECTION_KEYS> {
  if (resort.page_layout_version !== "v2") return [];
  const root: any = resort.v2 || resort.public_v2 || resort.v2_content || resort.v2_contents || {};
  return (Object.keys(V2_SECTION_KEYS) as Array<keyof typeof V2_SECTION_KEYS>).filter((section) => {
    const keys = V2_SECTION_KEYS[section];
    const data: any = keys.map((key) => root?.sections?.[key] ?? root?.[key]).find((value) => value != null) || {};
    const editorialKeys: Record<string, string> = { "meteo-neige": "v2_weather_snow_html", webcams: "v2_webcam_html", forfaits: "v2_ski_pass_html", "plan-des-pistes": "v2_piste_map_html" };
    if (typeof (resort as any)[editorialKeys[section]] === "string" && (resort as any)[editorialKeys[section]].trim()) return true;
    if ([data.content_html, data.html, data.content, data.editorial_content].some((value) => typeof value === "string" && value.trim())) return true;
    if (section === "webcams") {
      const items = data.items || data.webcams || resort.webcams;
      return Array.isArray(items) && items.some((item: any) => item && (item.iframeUrl || item.iframe_url || item.thumbUrl || item.thumb_url || item.image_url || item.pageUrl || item.page_url));
    }
    if (section === "forfaits") return [data.items, data.periods, (resort as any).ski_passes, (resort as any).ski_pass?.periods].some((items) => Array.isArray(items) && items.length);
    if (section === "plan-des-pistes") return [data.large_map_url, data.image_url, data.official_map_url, (resort as any).pistes_large_map_url, (resort as any).pistes_small_map_url, (resort as any).pistes_official_map_url].some((value) => typeof value === "string" && value.trim());
    return [data.summary, data.updated_at, data.observed_at, (resort as any).weather, (resort as any).snow].some(Boolean);
  });
}

const SITE_ORIGIN = "https://www.snow-explorer.com";
const STATIC_PATHS = ["/", "/stations", "/domaines-skiables", "/meteo", "/forfaits", "/plan-des-pistes", "/contact"];

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
};

export function parseLastModified(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function canonicalPart(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}

/** Deduplicate canonical URLs, preferring trustworthy API modification dates. */
export function getSitemapEntries(resorts: Resort[], regions: RegionSummary[], skiAreas: SkiAreaPublic[] = []): SitemapEntry[] {
  const entries: SitemapEntry[] = STATIC_PATHS.map((path) => ({ url: `${SITE_ORIGIN}${path}` }));

  for (const resort of resorts) {
    const slug = canonicalPart(resort?.slug);
    // The public endpoint is already active-only; retain its rows unless it
    // explicitly marks one inactive as an additional defensive check.
    if (resort?.is_active === false || !slug) continue;
    const lastModified = parseLastModified(resort.updated_at);
    entries.push({
      url: `${SITE_ORIGIN}/stations/${encodeURIComponent(slug)}`,
      ...(lastModified ? { lastModified } : {}),
    });
    for (const section of sitemapV2Sections(resort)) {
      entries.push({
        url: `${SITE_ORIGIN}/stations/${encodeURIComponent(slug)}/${section}`,
        ...(lastModified ? { lastModified } : {}),
      });
    }
  }
  for (const area of skiAreas) {
    const slug = canonicalPart(area?.slug);
    if (area?.status !== "published" || !slug) continue;
    const lastModified = parseLastModified(area.updated_at);
    entries.push({ url: `${SITE_ORIGIN}/domaines-skiables/${encodeURIComponent(slug)}`, ...(lastModified ? { lastModified } : {}) });
  }

  // Resort responses already contain the region used by the public page. Keep
  // them as a fallback because some deployments do not expose /api/regions.
  const regionCandidates = [
    ...regions,
    ...resorts
      .map((resort) => resort.region)
      .filter((region): region is RegionSummary => Boolean(region)),
  ];

  for (const region of regionCandidates) {
    const slug = regionSlug(region);
    if (!slug) continue;
    const lastModified = parseLastModified(region.updated_at);
    entries.push({
      url: `${SITE_ORIGIN}/regions/${encodeURIComponent(slug)}`,
      ...(lastModified ? { lastModified } : {}),
    });
  }

  const unique = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    const previous = unique.get(entry.url);
    if (!previous || (!previous.lastModified && entry.lastModified)) unique.set(entry.url, entry);
  }
  return [...unique.values()];
}

export function createSitemapXml(resorts: Resort[], regions: RegionSummary[], skiAreas: SkiAreaPublic[] = []): string {
  const entries = getSitemapEntries(resorts, regions, skiAreas)
    .map(({ url, lastModified }) => {
      const lastmod = lastModified ? `\n    <lastmod>${lastModified.toISOString()}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
