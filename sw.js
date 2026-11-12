// Guarda la app en el móvil para que se abra aunque no haya conexión.
const CACHE = "hybrid-coach-v3";
const FILES = ["./", "index.html", "dibujos.js", "temporada.json", "ejercicios.json", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero la red (para tener siempre la última versión); si no hay conexión, lo guardado.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
