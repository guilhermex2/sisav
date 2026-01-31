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

