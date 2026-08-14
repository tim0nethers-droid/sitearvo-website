import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'sitearvo-pages',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
);

registerRoute(
  ({ request }) => ['script', 'style', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'sitearvo-code' }),
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'sitearvo-images',
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') return caches.match('/offline.html');
  return Response.error();
});
