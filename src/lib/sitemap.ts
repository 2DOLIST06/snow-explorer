import type { Resort } from "@/lib/api/resorts";
import { regionSlug } from "@/lib/regions";

const SITE_ORIGIN = "https://www.snow-explorer.com";

const STATIC_PATHS = ["/", "/stations", "/meteo", "/forfaits", "/plan-des-pistes", "/contact"];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getSitemapUrls(resorts: Resort[]): string[] {
  const urls = new Set(STATIC_PATHS.map((path) => `${SITE_ORIGIN}${path}`));

  for (const resort of resorts) {
    urls.add(`${SITE_ORIGIN}/stations/${encodeURIComponent(resort.slug)}`);

    const slug = regionSlug(resort.region);
    if (slug) urls.add(`${SITE_ORIGIN}/regions/${encodeURIComponent(slug)}`);
  }

  return [...urls];
}

export function createSitemapXml(resorts: Resort[]): string {
  const entries = getSitemapUrls(resorts)
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
