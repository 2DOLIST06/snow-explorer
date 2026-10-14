const sanitizeHtml = require("sanitize-html");
const REGION_ORIGIN = "https://www.snow-explorer.com";

// An explicitly empty description is authoritative, including when seo_text is stale.
function getRegionDescription(region) {
  if (Object.prototype.hasOwnProperty.call(region || {}, "description_html")) {
    return typeof region.description_html === "string" ? region.description_html : "";
  }
  return typeof region?.seo_text === "string" ? region.seo_text : "";
}

function normalizeRegionLink(value) {
  const input = String(value || "").trim();
  if (!input || /[\u0000-\u0020\u007f\\]/.test(input)) return "";
  try {
    const url = new URL(input, REGION_ORIGIN);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
    if (url.hostname === new URL(REGION_ORIGIN).hostname) url.protocol = "https:";
    return url.href;
  } catch { return ""; }
}

function cleanRegionHtml(html) {
  return sanitizeHtml(String(html || ""), {
    allowedTags: ["p", "br", "h2", "h3", "strong", "b", "em", "i", "ul", "ol", "li", "blockquote", "a"],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["https", "http"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attributes) => {
        const href = normalizeRegionLink(attributes.href);
        return { tagName: "a", attribs: { ...(href ? { href } : {}), ...(attributes.title ? { title: attributes.title } : {}) } };
      },
    },
  }).trim();
}

module.exports = { REGION_ORIGIN, getRegionDescription, normalizeRegionLink, cleanRegionHtml };
