const CACHE_NAME = "mizan-pwa-v4";

// 1. Corrected asset paths
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json", // ✅ Fixed filename
  "/favicon.ico",
  "/Logo.svg"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled so 1 missing asset won't crash the whole SW
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch((err) => console.warn(`Failed to cache ${url}:`, err)))
      );
    })
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

// Network-First Strategy with Exclusions
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignore non-http/https (extensions, scheme-less)
  if (!url.protocol.startsWith("http")) return;

  // Ignore API requests (let server handle status codes like 405/500 directly)
  if (url.pathname.startsWith("/api/")) return;

  // Ignore external ads and tracking scripts
  if (
    url.hostname.includes("googlesyndication.com") ||
    url.hostname.includes("googletagmanager.com") ||
    url.hostname.includes("cloudflareinsights.com") ||
    url.hostname.includes("doubleclick.net") ||
    url.hostname.includes("adtrafficquality.google")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid responses
        if (response.status === 200 && (response.type === "basic" || response.type === "cors")) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        // 1. Check exact cache match
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // 2. Fallback to cached index.html for page navigation
        if (event.request.mode === "navigate") {
          const indexFallback = await caches.match("/index.html");
          if (indexFallback) return indexFallback;
        }

        // 3. Fallback response
        return new Response("Offline - resource not available", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" },
        });
      })
  );
});