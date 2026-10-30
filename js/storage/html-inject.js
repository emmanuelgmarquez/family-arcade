// Adds the arcade runtime <script> to a game's HTML *at launch time*.
// The game's stored files are never modified. Keep injectIntoHead() in sync with sw.js.

export function injectIntoHead(html, snippet) {
  const head = html.match(/<head(\s[^>]*)?>/i);
  if (head) return html.slice(0, head.index + head[0].length) + snippet + html.slice(head.index + head[0].length);
  const root = html.match(/<html(\s[^>]*)?>/i);
  if (root) return html.slice(0, root.index + root[0].length) + snippet + html.slice(root.index + root[0].length);
  const doctype = html.match(/<!doctype[^>]*>/i);
  if (doctype) return html.slice(0, doctype.index + doctype[0].length) + snippet + html.slice(doctype.index + doctype[0].length);
  return snippet + html;
}

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function runtimeTag(shimSrc, gameId) {
  return `<script src="${attr(shimSrc)}" data-fa-game="${attr(gameId)}"></script>`;
}

/**
 * Builds an iframe srcdoc for engines without a service worker (Capacitor/WKWebView).
 * <base> makes the game's relative URLs resolve against its real folder.
 */
export function buildSrcdoc(html, { baseHref, shimSrc, gameId, addOns = [], rootHref = baseHref }) {
  const extra = addOns.map((p) => /\.css$/.test(p)
    ? `<link rel="stylesheet" href="${attr(rootHref + p)}">`
    : `<script src="${attr(rootHref + p)}"></script>`).join('');
  const snippet = `<base href="${attr(baseHref)}">` + runtimeTag(shimSrc, gameId) + extra;
  return injectIntoHead(html, snippet);
}

/** Add-on files a game's arcade.json asks to load before the game ("inject": [...]). */
export function safeAddOns(meta) {
  const list = meta && Array.isArray(meta.inject) ? meta.inject : [];
  return list.filter((p) => typeof p === 'string' && /^[\w./-]+\.(js|css)$/.test(p) && !p.includes('..'));
}
