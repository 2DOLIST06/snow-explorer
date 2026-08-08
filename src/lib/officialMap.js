const CALAMEO_HOSTS = new Set(["calameo.com", "www.calameo.com"]);
const CALAMEO_PUBLICATION_ID = /^[a-z0-9]+$/i;

function normalizeOfficialMapUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  const trimmed = value.trim();
  const markdownMatch = trimmed.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
  const candidate = markdownMatch ? markdownMatch[2] : trimmed;

  try {
    const url = new URL(candidate);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

const getSafeHttpUrl = normalizeOfficialMapUrl;

function getCalameoEmbedUrl(value) {
  const safeUrl = getSafeHttpUrl(value);
  if (!safeUrl) return null;

  const url = new URL(safeUrl);
  if (!CALAMEO_HOSTS.has(url.hostname.toLowerCase())) return null;

  const match = url.pathname.match(/^\/read\/([^/]+)\/?$/);
  const publicationId = match?.[1];
  if (!publicationId || !CALAMEO_PUBLICATION_ID.test(publicationId)) return null;

  const embedUrl = new URL("https://v.calameo.com/");
  embedUrl.searchParams.set("bkcode", publicationId);
  const page = url.searchParams.get("page");
  if (page && /^\d+$/.test(page)) embedUrl.searchParams.set("page", page);
  return embedUrl.toString();
}

function getOfficialMapPresentation(value) {
  const sourceUrl = getSafeHttpUrl(value);
  if (!sourceUrl) return null;
  const calameoEmbedUrl = getCalameoEmbedUrl(sourceUrl);
  return {
    sourceUrl,
    embedUrl: calameoEmbedUrl || sourceUrl,
    provider: calameoEmbedUrl ? "calameo" : "generic",
  };
}

function selectMapMode({ smallMapUrl, largeMapUrl, officialMapUrl }) {
  if (smallMapUrl || largeMapUrl) return "image";
  const presentation = getOfficialMapPresentation(officialMapUrl);
  if (presentation?.provider === "calameo") return "embed";
  if (presentation?.provider === "generic") return "official-link";
  return "none";
}

module.exports = {
  getCalameoEmbedUrl,
  getOfficialMapPresentation,
  getSafeHttpUrl,
  normalizeOfficialMapUrl,
  selectMapMode,
};
