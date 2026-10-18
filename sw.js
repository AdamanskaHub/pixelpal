/* Offline shell. Bump VERSION whenever files change so phones pick up the update. */
var VERSION = 'pixelpal-v1';
var FILES = [
  './', 'index.html', 'style.css', 'manifest.json',
  'js/data.js', 'js/icons.js', 'js/creature.js', 'js/app.js', 'js/views.js', 'js/boot.js',
  'fonts/press-start-2p-latin-400-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Network first (so updates arrive), cache as fallback (so it works offline). */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match('index.html'); }); })
  );
});
