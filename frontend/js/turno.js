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
    Swal.fire({
      title: "Usuário não autenticado",
      text: "Faça login para acessar esta página.",
      icon: "warning"
    }).then(() => {
      window.location.href = "login.html";
    });
    return;
  }

  // ── VERIFICAÇÃO DE TURNO ANTERIOR ──────────────────────────────────────────
  const turnoAtivoRaw = localStorage.getItem("turnoAtivo"); // ex: "2025-05-13_42"

  if (turnoAtivoRaw) {
    const [dataTurno] = turnoAtivoRaw.split("_");           // "2025-05-13"
    const hoje = new Date().toISOString().split("T")[0];    // "2025-05-14"

    if (dataTurno === hoje) {
      // Turno de hoje ainda aberto — segue normalmente
      window.location.href = "campo.html";
      return;
    }

    // Turno de dia anterior encontrado — encerra automaticamente
    await encerrarTurnoAnterior(dataTurno, turnoAtivoRaw);
    // Não redireciona: deixa o agente criar o turno do dia
  }
  // ── FIM DA VERIFICAÇÃO ─────────────────────────────────────────────────────

  const hoje     = new Date().toISOString().split("T")[0];
  const agenteId = localStorage.getItem("agenteId");
  const turnoHoje = await db.turnos.get({ data: hoje, agenteId });

    const form = document.getElementById("form-turno");

    form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const agenteId   = localStorage.getItem("agenteId") || form.agente.value;
    const nomeAgente = form.agente.value;

    // Data gerada no frontend só para o localStorage e IndexedDB
    // O backend vai ignorar e usar a data do servidor
    const hoje = new Date().toISOString().split("T")[0];

    const turnoExiste = await db.turnos.get({ data: hoje, agenteId });
    if (turnoExiste) {
      alert("Já existe turno salvo nesta data!");
      return;
    }

    const turno = {
      data:                 hoje,         
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

    await sync.salvarTurno(turno);
    localStorage.setItem("turnoAtivo", `${hoje}_${agenteId}`); 
    Swal.fire({
      title: "Turno salvo com sucesso!",
      icon: "success"
    }).then(() => {
      window.location.href = "campo.html";
    });
  });
});

// ── FUNÇÃO DE ENCERRAMENTO AUTOMÁTICO ────────────────────────────────────────
async function encerrarTurnoAnterior(dataTurno, turnoAtivoRaw) {
  const agenteId = localStorage.getItem("agenteId");
  const token    = localStorage.getItem("token");

  try {
    // 1. Marca o turno no IndexedDB como encerrado automaticamente
    const turnoNoDb = await db.turnos.get({ data: dataTurno, agenteId });
    if (turnoNoDb) {
      await db.turnos.update(turnoNoDb.id, {
        encerrado_automaticamente: true,
        encerrado_em: new Date().toISOString(),
      });
    }

    // 2. Tenta informar o backend (não bloqueia o fluxo se falhar)
    await fetch("https://sisav-api.onrender.com/sync/turnos/encerrar-automatico", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        agente_id:  agenteId,
        data_turno: dataTurno,
        motivo:     "encerramento_automatico_sistema",
      }),
    });

  } catch (err) {
    // Sem conexão: o IndexedDB já foi atualizado, sync vai resolver depois
    console.warn("[Turno] Falha ao notificar backend:", err.message);
  } finally {
    // 3. Limpa o localStorage independente do resultado
    localStorage.removeItem("turnoAtivo");

    // 4. Avisa o agente com contexto claro
    alert(
      `⚠️ Seu turno de ${dataTurno} não foi finalizado.\n` +
      `Ele foi encerrado automaticamente pelo sistema.\n\n` +
      `Cadastre o turno de hoje para continuar.`
    );
  }
}