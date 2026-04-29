const CACHE_NAME = "sisav-v2";

const FILES_TO_CACHE = [
  "./html/login.html",
  "./html/turno.html",
  "./html/ficha-registro.html",
  "./html/historico.html",
  "./html/pendentes.html",
  "./html/ficha-recuperacao.html",
  "./html/tabela-recuperacao.html",
  "./html/tabela-registros.html",
  "./html/resumo_campo.html",
  "./css/style.css",
  "./js/db.js",
  "./js/historico.js",
  "./js/recuperacao.js",
  "./js/registros-new.js",
  "./js/resumo-campo.js",
  "./js/tabela-recuperacao.js",
  "./js/turno-guard.js",
  "./js/turno.js",
  "./js/sync.js",
  "./manifest.json",        
  "./icons/icon-192.png",
  "./icons/icon-512.png"
]

self.addEventListener("install", event => {
  console.log("📦 Instalando Service Worker SISAV");

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(FILES_TO_CACHE)
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
              return caches.match("/html/login.html"); // ✅ corrigido
            }
          });
      })
  );
});

///sisav/frontend/html/login.html

