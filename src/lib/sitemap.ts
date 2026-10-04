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
  const map: any = root.published_sections || root.sections_published || resort.v2_published_sections;
  return (Object.keys(V2_SECTION_KEYS) as Array<keyof typeof V2_SECTION_KEYS>).filter((section) => {
    const keys = V2_SECTION_KEYS[section];
    const data: any = keys.map((key) => root?.sections?.[key] ?? root?.[key]).find((value) => value != null) || {};
    let published = data.published === true || data.is_published === true || data.enabled === true || data.status === "published" || data.status === "ready";
    if (Array.isArray(map)) published = map.includes(section) || keys.some((key) => map.includes(key));
    else if (map && typeof map === "object") {
      const value = map[section] ?? keys.map((key) => map[key]).find((candidate) => typeof candidate === "boolean");
      if (typeof value === "boolean") published = value;
    }
    if (section !== "webcams" || !published) return published;
    const items = data.items || data.webcams || resort.webcams;
    return Array.isArray(items) && items.some((item: any) => item && (item.iframeUrl || item.iframe_url || item.thumbUrl || item.thumb_url || item.image_url || item.pageUrl || item.page_url));
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
