// Service Worker de auto-eliminación inmediata.
// Se instala, toma el control de inmediato (skipWaiting) y se desinstala,
// eliminando también toda la caché. Así el navegador carga SIEMPRE la
// versión más reciente del bundle desde la red.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(self.registration.unregister());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Pasar todo directamente a la red (sin caché).
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
