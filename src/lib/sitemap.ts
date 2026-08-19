import type { Resort } from "@/lib/api/resorts";
import type { RegionSummary } from "@/lib/regions";

const SITE_ORIGIN = "https://www.snow-explorer.com";
const STATIC_PATHS = ["/", "/stations", "/meteo", "/forfaits", "/plan-des-pistes", "/contact"];

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
export function getSitemapEntries(resorts: Resort[], regions: RegionSummary[]): SitemapEntry[] {
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
  }

  for (const region of regions) {
    const slug = canonicalPart(region?.slug) ?? canonicalPart(region?.id);
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

export function createSitemapXml(resorts: Resort[], regions: RegionSummary[]): string {
  const entries = getSitemapEntries(resorts, regions)
    .map(({ url, lastModified }) => {
      const lastmod = lastModified ? `\n    <lastmod>${lastModified.toISOString()}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
