/* Aurora Bay — offline support when the game is hosted on its own (not inside Family Arcade,
 * which has its own offline engine). On install it reads index.html and caches every script and
 * stylesheet it lists, so the file list never goes stale. Cache-first, refreshed in the background. */
var CACHE = 'aurora-bay-v1';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return fetch('index.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (html) {
      var urls = ['./', 'index.html'], re = /(?:src|href)="([^"#?]+\.(?:js|css|png))"/g, m;
      while ((m = re.exec(html))) urls.push(m[1]);
      return c.addAll(urls);
    });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (r) { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
