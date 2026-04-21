// campo.js
import { db } from "./db.js";
import { SyncManager } from "./sync-manager.js";

const sync = new SyncManager({
  apiUrl:     "https://sisav-api.onrender.com",
  onSyncOk:   (ids) => console.log(`[Sync] ${ids.length} enviado(s).`),
  onSyncErro: (err) => console.warn("[Sync] Falha:", err.message),
});
sync.init();

document.addEventListener("DOMContentLoaded", async () => {

  const turnoAtivoKey = localStorage.getItem("turnoAtivo");
  const agenteId      = localStorage.getItem("agenteId");

  if (!turnoAtivoKey) {
    alert("Não há turno ativo para registrar imóveis.");
    window.location.href = "turno.html";
    return;
  }

  const data       = turnoAtivoKey.split("_")[0];
  const turnoAtivo = await db.turnos.get({ data, agenteId });

  if (!turnoAtivo || turnoAtivo.finalizadoEm) {
    alert("Este turno já foi finalizado.");
    localStorage.removeItem("turnoAtivo");
    window.location.href = "turno.html";
    return;
  }

  // ── MODO RECUPERAÇÃO ──────────────────────────────────────────
  const params          = new URLSearchParams(window.location.search);
  const modoRecuperacao = params.get("recuperacao") === "1";
  const dadosPendente   = modoRecuperacao
    ? JSON.parse(sessionStorage.getItem("recuperacao_imovel") || "null")
    : null;

  if (modoRecuperacao && dadosPendente) {
    preencherCampo("logradouro",  dadosPendente.logradouro);
    preencherCampo("numero",      dadosPendente.numero);
    preencherCampo("complemento", dadosPendente.complemento);
    preencherCampo("quarteirao",  dadosPendente.quarteirao);
    preencherCampo("sequencia",   dadosPendente.sequencia);
    preencherCampo("lado",        dadosPendente.lado);
    exibirAvisoRecuperacao(dadosPendente);
  }

  // ── SUBMIT ────────────────────────────────────────────────────
  const form = document.getElementById("registroForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = Object.fromEntries(new FormData(form));

    const registro = {
      ...dados,
      data_turno: turnoAtivo.data,
      criado_em:  new Date().toISOString(),
    };

    if (modoRecuperacao && dadosPendente) {
      registro.is_recuperacao = true;
      sessionStorage.removeItem("recuperacao_imovel");

      // Recuperação vai para a store própria
      await sync.salvarRecuperacao(registro);

      alert("Recuperação registrada com sucesso!\nEste imóvel foi removido da lista de pendentes.");
      window.location.href = "pendentes.html";

    } else {
      // Registro normal de campo
      await sync.salvarRegistro(registro);

      alert("Registro salvo com sucesso!");
      form.reset();
    }
  });
});

// ── HELPERS ───────────────────────────────────────────────────

function preencherCampo(nome, valor) {
  if (valor === undefined || valor === null) return;
  const el = document.querySelector(`[name="${nome}"], #${nome}`);
  if (el) el.value = valor;
}

function exibirAvisoRecuperacao(dadosPendente) {
  const endereco = [
    dadosPendente.logradouro,
    dadosPendente.numero,
    dadosPendente.complemento
  ].filter(Boolean).join(", ");

  const aviso = document.createElement("div");
  aviso.style.cssText = `
    background: #FFF3E0;
    border-left: 5px solid #F57C00;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 18px;
    font-size: 14px;
    color: #5D4037;
    line-height: 1.6;
  `;
  aviso.innerHTML = `
    🔓 <strong>Modo Recuperação</strong><br>
    Você está registrando a visita de recuperação de um imóvel fechado.<br>
    <strong>Endereço:</strong> ${endereco || "Não informado"}<br>
    <small>⚠️ Este registro <strong>não será somado</strong> no total de imóveis inspecionados do dia.</small>
  `;

  const form = document.getElementById("registroForm");
  form.insertBefore(aviso, form.firstChild);
}