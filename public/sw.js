// Service worker DESATIVADO (kill switch).
// O app passou a ser cloud-only, sem cache offline no navegador. Este script
// existe apenas para que clientes que ainda tenham um service worker antigo
// instalado limpem todos os caches e se desregistrem sozinhos no próximo
// acesso. Depois disso, nenhum service worker fica ativo.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach(c => c.navigate(c.url));
    } catch {}
  })());
});

// Sem handler de fetch: as requisições vão direto para a rede, sem cache.
