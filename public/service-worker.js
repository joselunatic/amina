const CACHE_NAME = 'amina-pwa-v13';
const API_CACHE_NAME = 'amina-api-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.v2.js',
  '/graph-api.js',
  '/AMINA.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/locked.png',
  '/creature.png',
  '/entropia.svg',
  '/data/base_zones.json',
  '/modules/base3d.js',
  '/vendor/three/three.module.js',
  '/vendor/three/SVGLoader.js',
  '/vendor/three/three.core.js',
  '/vendor/three/examples/jsm/postprocessing/EffectComposer.js',
  '/vendor/three/examples/jsm/postprocessing/RenderPass.js',
  '/vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js',
  '/vendor/three/examples/jsm/postprocessing/ShaderPass.js',
  '/vendor/three/examples/jsm/postprocessing/OutputPass.js',
  '/vendor/three/examples/jsm/shaders/CopyShader.js',
  '/vendor/three/examples/jsm/postprocessing/Pass.js',
  '/vendor/three/examples/jsm/postprocessing/MaskPass.js',
  '/vendor/three/examples/jsm/shaders/LuminosityHighPassShader.js',
  '/vendor/three/examples/jsm/shaders/OutputShader.js',
  '/vendor/threlte-mcp/MCPBridge.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (key === CACHE_NAME || key === API_CACHE_NAME ? null : caches.delete(key)))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const isDossierEndpoint =
      url.pathname.startsWith('/api/pois') ||
      url.pathname.startsWith('/api/dm/entities') ||
      url.pathname.startsWith('/api/agent/entities') ||
      url.pathname.startsWith('/api/agent/journal');

    if (!isDossierEndpoint) {
      event.respondWith(fetch(request));
      return;
    }

    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        });

        return (
          cached ||
          fetchPromise.catch(
            () =>
              cached ||
              new Response('[]', {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              })
          )
        );
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
