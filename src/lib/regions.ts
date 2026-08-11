export type RegionSummary = {
  id?: string;
  name?: string;
  slug?: string;
  country_code?: string;
  seo_text?: string | null;
  description_html?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

export function regionSlug(region?: RegionSummary | null): string {
  if (region?.slug?.trim()) return region.slug.trim().toLowerCase();
  return (region?.name || region?.id || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function regionHref(region?: RegionSummary | null): string | null {
  const slug = regionSlug(region);
  return slug ? `/regions/${encodeURIComponent(slug)}` : null;
}

export function isRegionMatch(region: RegionSummary | null | undefined, slug: string): boolean {
  const wanted = decodeURIComponent(slug).toLowerCase();
  return regionSlug(region) === wanted || region?.id?.toLowerCase() === wanted;
}
