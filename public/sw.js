const CACHE_NAME = "mizan-pwa-v4";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/site.webmanifest",
  "/Logo.svg",
  "/robots.txt",
  "/feed.xml",
  "/sitemap.xml"
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

// Network-First Strategy with Safety Checks
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 🚨 CRITICAL FIX: Only allow standard http and https requests.
  // This completely ignores chrome-extension://, moz-extension://, etc.
  if (!url.protocol.startsWith("http")) return;

  // Skip caching for external ads and analytics tracking
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
        // Cache valid basic/cors responses
        if (response.status === 200 && (response.type === "basic" || response.type === "cors")) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        // 1. Try exact match in cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // 2. For navigations, fall back to cached index.html
        if (event.request.mode === "navigate") {
          const indexFallback = await caches.match("/index.html");
          if (indexFallback) return indexFallback;
        }

        // 3. Absolute last resort — always return a valid Response,
        //    never undefined (this is what was causing the
        //    "Failed to convert value to 'Response'" error)
        return new Response("Offline - resource not available", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" },
        });
      })
  );
});