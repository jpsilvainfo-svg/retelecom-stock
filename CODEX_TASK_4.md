# 🔵 Task-4: Implementar PWA Completo (OPCIONAL)

**Branch:** `feature/pwa-complete`
**Responsável:** Codex (implementação interativa)
**Status:** Pronto para começar

---

## 🎯 Objetivos

1. ✅ Service Worker robusto com sincronização
2. ✅ Offline-first com suporte completo
3. ✅ Cache estratégico (CacheFirst, NetworkFirst, StaleWhileRevalidate)
4. ✅ Background Sync para dados críticos
5. ✅ Install prompt melhorado
6. ✅ Web App Manifest otimizado

---

## 📦 Estrutura PWA

```
src/
├── pwa/
│   ├── serviceWorker.js (SW principal)
│   ├── sw-offline.js (offline handler)
│   ├── sw-sync.js (background sync)
│   └── sw-push.js (notificações push)
├── utils/
│   └── pwaHelper.js
├── components/
│   └── InstallPrompt.jsx
└── ...

public/
├── manifest.json
├── robots.txt
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── favicon.ico
└── ...
```

---

## 📋 Checklist PWA

### **1. Web App Manifest**

Criar/atualizar `public/manifest.json`:
```json
{
  "name": "StockTel - Sistema de Estoque e Frota",
  "short_name": "StockTel",
  "description": "Sistema integrado de gestão de estoque, frota e operações",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#070707",
  "theme_color": "#d10000",
  "orientation": "portrait-primary",
  "categories": ["business", "productivity"],
  "screenshots": [
    {
      "src": "/icons/screenshot-1.png",
      "sizes": "540x720",
      "form_factor": "narrow"
    },
    {
      "src": "/icons/screenshot-wide.png",
      "sizes": "1280x720",
      "form_factor": "wide"
    }
  ],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "Acessar dashboard",
      "url": "/?shortcut=dashboard",
      "icons": [{ "src": "/icons/dashboard.png", "sizes": "192x192" }]
    },
    {
      "name": "Estoque",
      "short_name": "Estoque",
      "description": "Gerenciar estoque",
      "url": "/?shortcut=estoque",
      "icons": [{ "src": "/icons/estoque.png", "sizes": "192x192" }]
    }
  ],
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "arquivo",
          "accept": ["application/json", "text/csv"]
        }
      ]
    }
  }
}
```

---

### **2. Service Worker Principal**

Criar `src/pwa/serviceWorker.js`:
```javascript
// Cache version
const CACHE_NAME = 'stocktel-v1.3.1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/index.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache inicial criado');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activate: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deletando cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch: estratégias de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API do Supabase: NetworkFirst
  if (url.hostname.includes('supabase.co')) {
    return event.respondWith(
      fetch(request)
        .then((response) => {
          // Atualizar cache com resposta
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }

  // Imagens: CacheFirst (fallback para placeholder)
  if (request.destination === 'image') {
    return event.respondWith(
      caches.match(request).then((response) => {
        return (
          response ||
          fetch(request)
            .then((fetchResponse) => {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, fetchResponse.clone());
              });
              return fetchResponse;
            })
            .catch(() => new Response('Imagem não disponível offline'))
        );
      })
    );
  }

  // JavaScript/CSS: CacheFirst
  if (
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    return event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
  }

  // HTML: NetworkFirst (StaleWhileRevalidate)
  if (request.destination === 'document') {
    return event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
          });
          return response;
        })
        .catch(() => {
          return caches.match(request) ||
            new Response('Página não disponível offline', {
              status: 503,
              statusText: 'Service Unavailable',
            });
        })
    );
  }

  // Default: NetworkFirst
  return event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
```

---

### **3. Background Sync**

Criar `src/pwa/sw-sync.js`:
```javascript
// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingData());
  } else if (event.tag === 'sync-logs') {
    event.waitUntil(syncLogs());
  }
});

async function syncPendingData() {
  try {
    const db = await openIndexDB();
    const pending = await db.getAll('pending-requests');

    for (const request of pending) {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      if (response.ok) {
        await db.delete('pending-requests', request.id);
      }
    }
  } catch (error) {
    console.error('[SW] Erro ao sincronizar:', error);
    throw error; // Retry
  }
}

async function syncLogs() {
  try {
    const logs = await getLocalLogs();
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logs),
    });
    await clearLocalLogs();
  } catch (error) {
    console.error('[SW] Erro ao enviar logs:', error);
    throw error;
  }
}
```

---

### **4. Install Prompt Customizado**

Criar `src/components/InstallPrompt.jsx`:
```javascript
import { useEffect, useState } from 'react';
import '../styles/install-prompt.css';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Interceptar evento de install
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setPrompt(e);
      
      // Mostrar banner após 3 segundos
      setTimeout(() => setShow(true), 3000);
    });

    // Verificar instalação
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App instalado!');
      setShow(false);
      setPrompt(null);
    });
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] Usuário aceitou instalação');
      setShow(false);
    }

    setPrompt(null);
  };

  if (!show || !prompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <h3>Instalar StockTel</h3>
        <p>Acesse a aplicação offline com um clique</p>
        <div className="install-prompt-buttons">
          <button onClick={handleInstall} className="btn-install">
            Instalar
          </button>
          <button onClick={() => setShow(false)} className="btn-dismiss">
            Não agora
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### **5. Registrar Service Worker**

Atualizar `src/main.jsx`:
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/serviceWorker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration);
      })
      .catch((error) => {
        console.error('[PWA] Erro ao registrar SW:', error);
      });
  });
}

// Solicitar permissão de notificação
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
```

---

## 🧪 Teste de PWA

```bash
# Build de produção
npm run build

# Servir com HTTPS (PWA requer HTTPS)
vercel dev

# Abrir DevTools
# Application → Manifest → verificar
# Application → Service Workers → Status
```

---

## ✅ Checklist PWA

- [ ] `public/manifest.json` criado
- [ ] Icons criados (192x192, 512x512, maskable)
- [ ] `src/pwa/serviceWorker.js` implementado
- [ ] Background Sync implementado
- [ ] `src/components/InstallPrompt.jsx` criado
- [ ] Service Worker registrado em `main.jsx`
- [ ] Testado offline
- [ ] Testado install prompt
- [ ] Performance Lighthouse A+
- [ ] Documentação atualizada

---

## 📊 Métricas Esperadas

| Métrica | Target |
|---------|--------|
| Lighthouse PWA | 90+ |
| Performance | 90+ |
| Accessibility | 90+ |
| Best Practices | 90+ |
| SEO | 100 |
| Install Speed | <2s |
| Offline Access | 100% |

---

## 🕐 Tempo Estimado

- Manifest: 30 min
- Service Worker: 1 hora
- Background Sync: 1 hora
- Install Prompt: 30 min
- Testes: 1 hora

**Total: ~4 horas**

---

## 🔗 Referências

- [PWA Checklist](https://www.pwachecklist.com/)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Manifest Generator](https://www.pwabuilder.com/)

---

**Criado em:** 2026-06-07
**Versão:** 1.0
