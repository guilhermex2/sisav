// turno.js
import { db } from "./db.js";
import { SyncManager } from "./sync-manager.js";

const sync = new SyncManager({
  apiUrl:     "https://sisav-api.onrender.com",
  onSyncOk:   (ids) => console.log(`[Sync] ${ids.length} enviado(s).`),
  onSyncErro: (err) => console.warn("[Sync] Falha:", err.message),
});
sync.init();

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Usuário não autenticado.");
    window.location.href = "login.html";
  }

  const turnoLogado = localStorage.getItem("turnoAtivo");
  if (turnoLogado) {
    window.location.href = "campo.html";
  }

  const hoje     = new Date().toISOString().split("T")[0];
  const agenteId = localStorage.getItem("agenteId");

  const turnoHoje = await db.turnos.get({ data: hoje, agenteId });

  const form = document.getElementById("form-turno");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data       = form.data.value;
    const agenteId   = localStorage.getItem("agenteId") || form.agente.value;
    const nomeAgente = form.agente.value;

    const turnoExiste = await db.turnos.get({ data, agenteId });
    if (turnoExiste) {
      alert("Já existe turno salvo nesta data!");
      return;
    }

    const turno = {
      data:                 form.data.value,
      municipio:            form.municipio.value,
      ciclo:                form.ciclo.value,
      localidade:           form.localidade.value,
      categoria_localidade: form.categoria_localidade.value,
      zona:                 form.zona.value,
      atividade:            form.atividade.value,
      agente:               nomeAgente,
      nomeAgente:           nomeAgente,
      agenteId:             agenteId,
    };

    
    // salva no IndexedDB e enfileira para sync automático.
    await sync.salvarTurno(turno);

    localStorage.setItem("turnoAtivo", `${turno.data}_${agenteId}`);

    alert("Turno salvo com sucesso!");
    window.location.href = "campo.html";
  });
});