const CACHE_NAME = "sisav-v2";

const FILES_TO_CACHE = [
  "/sisav/frontend/html/login.html",
  "/sisav/frontend/html/turno.html",
  "/sisav/frontend/html/ficha-registro.html",
  "/sisav/frontend/html/historico.html",
  "/sisav/frontend/html/pendentes.html",
  "/sisav/frontend/html/ficha-recuperacao.html",
  "/sisav/frontend/html/tabela-recuperacao.html",
  "/sisav/frontend/html/tabela-registros.html",
  "/sisav/frontend/html/resumo_campo.html",
  "/sisav/frontend/css/style.css",
  "/sisav/frontend/js/db.js",
  "/sisav/frontend/js/historico.js",
  "/sisav/frontend/js/recuperacao.js",
  "/sisav/frontend/js/registros-new.js",
  "/sisav/frontend/js/resumo-campo.js",
  "/sisav/frontend/js/tabela-recuperacao.js",
  "/sisav/frontend/js/turno-guard.js",
  "/sisav/frontend/js/turno.js",
  "/sisav/frontend/js/sync.js",
  "/sisav/frontend/manifest.json",        
  "/sisav/frontend/icons/icon-192.png",
  "/sisav/frontend/icons/icon-512.png"
]

self.addEventListener("install", event => {
  console.log("📦 Instalando Service Worker SISAV");

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(FILES_TO_CACHE)
      .catch(err => console.error("❌ Falha ao cachear arquivos:", err))
    )
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  console.log("🚀 Service Worker ativo");

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("🧹 Limpando cache antigo:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            if (event.request.mode === "navigate") {
              return caches.match("/sisav/frontend/html/login.html"); // 
            }
          });
      })
  );
});

///sisav/frontend/html/login.html

