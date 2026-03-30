// Kshare Service Worker — enables PWA install prompt + offline support
const CACHE_NAME = "kshare-v2";
const PRECACHE_URLS = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon-180.png",
  "/",
  "/notre-mission",
  "/je-suis-client",
  "/faq",
  "/contact",
  "/cgu",
  "/confidentialite",
];

// Install — precache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first strategy (always prefer fresh data)
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip non-http(s) requests
  if (!event.request.url.startsWith("http")) return;

  // Skip API/auth requests — never cache these
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/supabase/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets + public pages
        const publicPages = ["/", "/notre-mission", "/je-suis-client", "/faq", "/contact", "/cgu", "/confidentialite"];
        if (
          response.ok &&
          (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|css|js)$/) ||
            url.pathname === "/manifest.json" ||
            publicPages.includes(url.pathname))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});
