const CACHE_NAME = "mizan-pwa-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/favicon.ico",
  "/Logo.svg"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate Service Worker & Clean Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Network-First Strategy with Offline SPA Fallback
self.addEventListener("fetch", (event) => {
  // Only process GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip caching for external ads, analytics, or browser extensions
  if (
    url.protocol === "chrome-extension:" ||
    url.hostname.includes("googlesyndication.com") ||
    url.hostname.includes("googletagmanager.com")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTTP/HTTPS GET responses
        if (response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // Fallback to index.html for navigation route requests offline
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      })
  );
});