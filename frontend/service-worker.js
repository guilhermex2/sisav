const CACHE_NAME = "sisav-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/turno.html",
  "/resumo.html",
  "/resumo-campo.html",

  "/css/style.css",

  "/js/db.js",
  "/js/resumo.js",
  "/js/turno.js",

  "/manifest.json"
];

// 📦 Instalação
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// ♻️ Ativação
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
});

// 🌐 Intercepta requisições
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});
