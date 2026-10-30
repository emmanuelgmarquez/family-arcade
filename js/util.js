// Small shared helpers. No dependencies.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Tiny DOM builder: h('button.primary', { onclick }, 'Play') */
export function h(tag, props = {}, ...children) {
  if (props === null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const [name, ...classes] = tag.split('.');
  const node = document.createElement(name || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className += (node.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v === true) node.setAttribute(k, '');
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function slugify(s) {
  const slug = String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-')
    .slice(0, 40).replace(/-+$/, '');
  return slug || 'game';
}

export function randomSuffix(n = 4) {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  for (const b of bytes) s += a[b % a.length];
  return s;
}

export function formatBytes(n) {
  if (!n) return '0 KB';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10 * 1024 ? 1 : 0) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export function formatDuration(ms) {
  const m = Math.floor((ms || 0) / 60000);
  if (m < 1) return 'under a minute';
  if (m < 60) return m + ' min';
  const hrs = Math.floor(m / 60);
  return hrs + 'h ' + (m % 60) + 'm';
}

export function timeAgo(ts) {
  if (!ts) return 'Never played';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  const d = Math.floor(s / 86400);
  if (d === 1) return 'Yesterday';
  if (d < 7) return d + ' days ago';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d > 300 ? 'numeric' : undefined });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}
export function dirname(p) {
  const i = p.lastIndexOf('/');
  return i === -1 ? '' : p.slice(0, i + 1);
}
export function extname(p) {
  const m = /\.([a-z0-9]+)$/i.exec(p);
  return m ? m[1].toLowerCase() : '';
}

const MIME = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', xhtml: 'application/xhtml+xml',
  js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', cjs: 'text/javascript; charset=utf-8', jsx: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', map: 'application/json; charset=utf-8',
  webmanifest: 'application/manifest+json', wasm: 'application/wasm',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp', cur: 'image/x-icon',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4',
  aac: 'audio/aac', flac: 'audio/flac', weba: 'audio/webm', mid: 'audio/midi', midi: 'audio/midi',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2', eot: 'application/vnd.ms-fontobject',
  txt: 'text/plain; charset=utf-8', md: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8',
  xml: 'application/xml', tmx: 'application/xml', tsx: 'application/xml', fnt: 'text/plain; charset=utf-8',
  atlas: 'text/plain; charset=utf-8', glsl: 'text/plain; charset=utf-8', vert: 'text/plain; charset=utf-8', frag: 'text/plain; charset=utf-8',
  gltf: 'model/gltf+json', glb: 'model/gltf-binary', obj: 'text/plain; charset=utf-8', mtl: 'text/plain; charset=utf-8',
  bin: 'application/octet-stream', zip: 'application/zip'
};
export function mimeFor(path) {
  return MIME[extname(path)] || 'application/octet-stream';
}

export function isHtmlPath(p) { return /\.x?html?$/i.test(p); }

const decoder = new TextDecoder('utf-8');
export function bytesToText(bytes) { return decoder.decode(bytes); }
export function textToBytes(text) { return new TextEncoder().encode(text); }

export function bytesToBase64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s);
}
export function base64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true;
}

export function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Simple localStorage-backed shell preferences (never collides with game saves, which use "fa:g:"). */
const PREF_PREFIX = 'fa-shell:';
export const prefs = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(PREF_PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PREF_PREFIX + key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
  }
};
