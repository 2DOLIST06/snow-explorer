const sanitize = require("sanitize-html");
const richTags = ["p", "br", "h2", "h3", "h4", "strong", "em", "ul", "ol", "li", "blockquote", "a", "img"];
const https = value => { try { const parsed = new URL(value); return parsed.protocol === "https:" && !parsed.username && !parsed.password; } catch { return false; } };
function cleanActivityHtml(html) {
  return sanitize(html || "", {
    allowedTags: richTags,
    allowedAttributes: { a: ["href", "title", "target", "rel", "class"], img: ["src", "alt", "title", "loading"] },
    allowedSchemes: ["https"], allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({ tagName: "a", attribs: { ...attrs, class: attrs.class === "activity-button" ? attrs.class : "", rel: "sponsored noopener noreferrer", target: attrs.target === "_blank" ? "_blank" : "_self" } }),
      img: (_tag, attrs) => ({ tagName: "img", attribs: { ...attrs, loading: "lazy" } }),
    },
  });
}
function activeActivityItems(block) {
  if (!block?.enabled || !Array.isArray(block.items)) return [];
  return block.items.filter(item => item.enabled && (
    item.type === "image" ? https(item.src) && https(item.href) :
    item.type === "rich" ? /<img\b/i.test(cleanActivityHtml(item.html)) || sanitize(cleanActivityHtml(item.html), { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;|\s/g, "").length > 0 :
    item.type === "embed" && Boolean(item.html?.trim())
  ));
}
// Extract only ordinary HTTPS anchors, never external resources or scripts.
// Keep the stored destination exactly as supplied, including affiliate params.
function activityEmbedLinksHtml(html) {
  const links = [], seen = new Set();
  const attr = value => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  sanitize(html || "", {
    allowedTags: ["a"], allowedAttributes: { a: ["href", "target"] },
    allowedSchemes: ["https"], allowProtocolRelative: false,
    nonTextTags: ["script", "style", "iframe", "textarea", "noscript", "template"],
    exclusiveFilter: frame => {
      if (frame.tag === "a" && https(frame.attribs.href) && !seen.has(frame.attribs.href)) {
        const href = frame.attribs.href;
        seen.add(href);
        const label = sanitize(frame.text || "Voir les activités", { allowedTags: [], allowedAttributes: {} });
        links.push(`<a href="${attr(href)}" target="${frame.attribs.target === "_self" ? "_self" : "_blank"}" rel="sponsored noopener noreferrer">${label}</a>`);
      }
      return true;
    },
  });
  return links.join(" ");
}
function widgetDocument(item, nonce, token) {
  const origins = new Set((item.origins || []).filter(https).map(value => new URL(value).origin));
  let gygPartnerId = null;
  const scriptUrls = new Set();
  const gygScript = "https://widget.getyourguide.com/dist/pa.umd.production.min.js";
  const html = sanitize(item.html || "", {
    allowedTags: ["div", "span", "p", "a", "img", "iframe", "script", "br", "strong", "em"],
    allowedAttributes: { "*": ["id", "class", "style", "data-*", "title"], a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], script: ["src", "async", "defer", "type", "data-*"], iframe: ["src", "title", "width", "height", "loading", "allowfullscreen", "sandbox", "referrerpolicy"] },
    allowedSchemes: ["https"], allowProtocolRelative: false, allowVulnerableTags: true,
    exclusiveFilter: frame => frame.tag === "script" && !https(frame.attribs.src),
    transformTags: {
      div: (_tag, attrs) => {
        if (attrs['data-gyg-widget'] === 'activities' && /^https:\/\/widget\.getyourguide\.com\//.test(attrs['data-gyg-href'] || '') && /^[a-zA-Z0-9_-]{1,100}$/.test(attrs['data-gyg-partner-id'] || '')) {
          gygPartnerId = attrs['data-gyg-partner-id'];
          origins.add('https://widget.getyourguide.com');
          origins.add('https://www.getyourguide.com');
        }
        return { tagName: 'div', attribs: attrs };
      },
      script: (_tag, attrs) => { if (https(attrs.src)) { origins.add(new URL(attrs.src).origin); scriptUrls.add(new URL(attrs.src).origin + new URL(attrs.src).pathname); } return { tagName: "script", attribs: attrs }; },
      iframe: (_tag, attrs) => { if (https(attrs.src)) origins.add(new URL(attrs.src).origin); return { tagName: "iframe", attribs: { ...attrs, sandbox: "allow-scripts allow-popups allow-same-origin", referrerpolicy: "no-referrer" } }; },
      a: (_tag, attrs) => ({ tagName: "a", attribs: { ...attrs, target: "_blank", rel: "sponsored noopener noreferrer" } }),
      img: (_tag, attrs) => { if (https(attrs.src)) origins.add(new URL(attrs.src).origin); return { tagName: "img", attribs: attrs }; },
    },
  });
  const bootstrap = gygPartnerId && !scriptUrls.has(gygScript) ? `<script async src="${gygScript}" data-gyg-partner-id="${gygPartnerId}"></script>` : "";
  const sources = [...origins].join(" ");
  // No same-origin privilege in the outer frame. External scripts remain
  // isolated from both the admin document and the public application.
  const csp = `default-src 'none'; script-src 'nonce-${nonce}' ${sources}; style-src 'unsafe-inline' ${sources}; img-src https: data:; connect-src ${sources || "'none'"}; frame-src ${sources || "'none'"}; font-src ${sources || "'none'"}; base-uri 'none'; form-action 'none'; object-src 'none'`;
  const runtime = `const token=${JSON.stringify(token)};const send=(kind,data)=>parent.postMessage({token,kind,...data},'*');const size=()=>send('size',{height:document.body.scrollHeight});new ResizeObserver(size).observe(document.body);window.addEventListener('load',size);window.addEventListener('error',()=>send('error',{}),true);window.addEventListener('unhandledrejection',()=>send('error',{}));new MutationObserver(()=>{document.querySelectorAll('a').forEach(a=>{a.rel='sponsored noopener noreferrer';a.target='_blank'});size()}).observe(document.body,{childList:true,subtree:true});size();`;
  const escape = value => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escape(csp)}"><style>html,body{margin:0;width:100%;font:16px/1.5 system-ui;overflow-wrap:anywhere}*{box-sizing:border-box;max-width:100%}img{height:auto}iframe{width:100%;border:0}a{color:#0b6c9e}</style></head><body><script nonce="${escape(nonce)}">${runtime}</script>${html}${bootstrap}</body></html>`;
}
module.exports = { cleanActivityHtml, activeActivityItems, activityEmbedLinksHtml, widgetDocument };
