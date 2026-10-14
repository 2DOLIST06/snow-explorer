const sanitizeHtml = require('sanitize-html');
const REGION_ORIGIN = 'https://www.snow-explorer.com';
function absoluteRegionLink(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const link = value.trim();
  if (!/^https?:\/\//i.test(link) && !/^\/(?!\/)/.test(link)) return null;
  try { const url = new URL(link, REGION_ORIGIN); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function sanitizeRegionHtml(value) {
  return sanitizeHtml(typeof value === 'string' ? value : '', {
    allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a'],
    allowedAttributes: { a: ['href'] }, allowedSchemes: ['http', 'https'], allowProtocolRelative: false,
    transformTags: { a: (tagName, attributes) => ({ tagName, attribs: /^https?:\/\//i.test(attributes.href || '') && absoluteRegionLink(attributes.href) ? { href: attributes.href } : {} }) },
  });
}
function regionDescription(region) {
  // An explicitly empty description must never resurrect historical seo_text.
  return typeof region?.description_html === 'string' ? region.description_html : '';
}
function hasRegionContent(html) { return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&(?:nbsp|#160);/g, ' ').trim().length > 0; }
module.exports = { sanitizeRegionHtml, absoluteRegionLink, regionDescription, hasRegionContent };
