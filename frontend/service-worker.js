const CACHE_NAME = "sisav-v1";

const FILES_TO_CACHE = [
  "/sisav/",
  "/sisav/frontend/html/turno.html",
  "/sisav/frontend/html/ficha-registro.html",
  "/sisav/frontend/html/historico.html",
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
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log("📦 Iniciando cache manual...");

      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
          console.log("✅ Cacheado:", file);
        } catch (err) {
          console.error("❌ Falhou ao cachear:", file);
          throw err; // força o erro aparecer
        }
      }
    }).catch(err => {
      console.error("🔥 Erro no install do SW:", err);
    })
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(response => {
      // 1️⃣ Se existe no cache, retorna
      if (response) {
        return response;
      }

      // 2️⃣ Tenta rede
      return fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => {
      // 3️⃣ OFFLINE TOTAL → devolve página inicial
      if (event.request.mode === "navigate") {
        return caches.match("/frontend/html/turno.html");
      }
    })
  );
});

