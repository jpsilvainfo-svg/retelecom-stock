// Service Worker — StockTel PWA
const CACHE = "stocktel-v1";
const STATIC = ["/", "/index.html", "/favicon-stocktel.png", "/logo-stocktel.png", "/manifest.json"];

// Instala e pré-cacheia assets estáticos
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

// Ativa e limpa caches antigos
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Estratégia: Network-first para API, Cache-first para assets
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Ignora chamadas de API e Supabase — sempre vai para rede
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) return;

  // Assets JS/CSS — Cache-first (atualiza em background)
  if (e.request.destination === "script" || e.request.destination === "style") {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(r => {
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
          return r;
        });
        return cached || network;
      })
    );
    return;
  }

  // Páginas HTML — Network-first com fallback para cache
  e.respondWith(
    fetch(e.request)
      .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
      .catch(() => caches.match(e.request).then(c => c || caches.match("/index.html")))
  );
});
