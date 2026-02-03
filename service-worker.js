const CACHE_NAME = "sisav-v1";

const FILES_TO_CACHE = [
  "/frontend/html/turno.html",
  "/frontend/html/ficha-registro.html",
  "/frontend/html/historico.html",
  "/frontend/html/ficha-recuperacao.html",
  "/frontend/html/tabela-recuperacao.html",
  "/frontend/html/tabela-registros.html",
  "/frontend/html/resumo_campo.html",

  "/frontend/css/style.css",

  "/frontend/js/db.js",
  "/frontend/js/historico.js",
  "/frontend/js/recuperacao.js",
  "/frontend/js/registros-new.js",
  "/frontend/js/resumo-campo.js",
  "/frontend/js/tabela-recuperacao.js",
  "/frontend/js/turno-guard.js",
  "/frontend/js/turno.js",
  "/frontend/js/sync.js",
];

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
    caches.match(event.request).then(response => {
      // 1️⃣ Cache primeiro
      if (response) return response;

      // 2️⃣ Rede + cache dinâmico
      return fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => {
      // 3️⃣ Offline total → fallback
      if (event.request.mode === "navigate") {
        return caches.match("/frontend/html/turno.html");
      }
    })
  );
});
