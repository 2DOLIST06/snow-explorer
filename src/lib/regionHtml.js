const sanitizeHtml = require('sanitize-html');
const REGION_ORIGIN = 'https://www.snow-explorer.com';
function absoluteRegionLink(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const link = value.trim();
  if (/[\u0000-\u0020\u007f\\]/.test(link)) return null;
  if (!/^https?:\/\//i.test(link) && !/^\/(?!\/)/.test(link)) return null;
  try {
    const url = new URL(link, REGION_ORIGIN);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.hostname === new URL(REGION_ORIGIN).hostname) url.protocol = 'https:';
    return url.href;
  } catch { return null; }
}
function sanitizeRegionHtml(value, normalizeLinks = false) {
  return sanitizeHtml(typeof value === 'string' ? value : '', {
    allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a'],
    allowedAttributes: { a: ['href'] }, allowedSchemes: ['http', 'https'], allowProtocolRelative: false,
    transformTags: { a: (tagName, attributes) => {
      const href = (normalizeLinks || /^https?:\/\//i.test(attributes.href || '')) ? absoluteRegionLink(attributes.href) : null;
      return { tagName, attribs: href ? { href } : {} };
    } },
  });
}
function regionDescription(region) {
  // An explicitly empty description must never resurrect historical seo_text.
  return typeof region?.description_html === 'string' ? region.description_html : '';
}
function hasRegionContent(html) { return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&(?:nbsp|#160);/g, ' ').trim().length > 0; }
function normalizeRegionLink(value) { return absoluteRegionLink(value) || ''; }
function cleanRegionHtml(value) { return sanitizeRegionHtml(value, true).trim(); }

const REGION_STATIONS = '{{REGION_STATIONS}}';
// Split sanitized HTML while closing/reopening ancestors, including inline markers.
function splitAtMarker(html) {
  const index = html.indexOf(REGION_STATIONS);
  if (index < 0) return { before: html, after: '', hasMarker: false };
  const before = html.slice(0, index);
  const stack = [];
  for (const match of before.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)) {
    if (match[0].startsWith('</')) stack.pop();
    else if (match[1] !== 'br') stack.push({ tag: match[1], html: match[0] });
  }
  return {
    before: before + [...stack].reverse().map(item => `</${item.tag}>`).join(''),
    after: stack.map(item => item.html).join('') + html.slice(index + REGION_STATIONS.length),
    hasMarker: true,
  };
}
function splitRegionDescription(value) {
  // Remove tokens in attributes as well: a public URL must never leak the marker.
  const html = sanitizeRegionHtml(value).replace(/<[^>]*>/g, tag => tag.split(REGION_STATIONS).join(''));
  const parts = splitAtMarker(html);
  return { ...parts, after: parts.after.split(REGION_STATIONS).join('') };
}
function regionEditorHtml(value) {
  let remaining = cleanRegionHtml(value).replace(/<p>\s*\{\{REGION_STATIONS\}\}\s*<\/p>/g, REGION_STATIONS);
  let html = '';
  while (remaining.includes(REGION_STATIONS)) {
    const parts = splitAtMarker(remaining);
    html += parts.before + '<div data-region-stations="true"></div>';
    remaining = parts.after;
  }
  return html + remaining;
}
module.exports = { REGION_STATIONS, splitRegionDescription, regionEditorHtml, sanitizeRegionHtml, absoluteRegionLink, regionDescription, hasRegionContent, normalizeRegionLink, cleanRegionHtml };
