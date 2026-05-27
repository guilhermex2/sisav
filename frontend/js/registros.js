// registros.js  (campo.js)
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
    registro.is_recuperacao = true

    // 1. Salva a visita normalmente via sync (tipoVisita vira RECUPERACAO no backend)
    sync.salvarRegistro(registro)

    // 2. Faz PATCH para marcar o ImovelFechado como RECUPERADO
    if (dadosPendente.imovelFechadoId) {
      try {
        await fetch(
          `https://sisav-api.onrender.com/imoveis-fechados/${dadosPendente.imovelFechadoId}/recuperar`,
          {
            method:  "PATCH",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({}),
          }
        )
      } catch (err) {
        console.warn("[Recuperação] Falha ao atualizar status:", err.message)
        // Não bloqueia o fluxo — o backend pode reconciliar via sync depois
      }
    }

    sessionStorage.removeItem("recuperacao_imovel")
    alert("Recuperação registrada com sucesso!\nEste imóvel foi removido da lista de pendentes.")
    window.location.href = "pendentes.html"
  }

  // ── SUBMIT ────────────────────────────────────────────────────
  const form = document.getElementById("registroForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = Object.fromEntries(new FormData(form));

    const registro = {
      ...dados,
      data_turno: turnoAtivo.data,
      agenteId:   Number(localStorage.getItem("agenteId")),
      criado_em:  new Date().toISOString(),
    };

    if (modoRecuperacao && dadosPendente) {
      registro.is_recuperacao   = true;
      // Guarda referência ao registro original fechado para atualização
      registro.recuperacao_ref  = dadosPendente.id ?? null;
      registro.recuperacao_data = dadosPendente.data_turno ?? null;
      sessionStorage.removeItem("recuperacao_imovel");

      // FIX 3: Salva na store "recuperacao" E atualiza flag no registro original
      await sync.salvarRecuperacao(registro);

      // Se o registro original existe no IndexedDB, marca como recuperado
      if (dadosPendente.id) {
        await db.registros.update(dadosPendente.id, {
          recuperado:    true,
          recuperado_em: new Date().toISOString(),
        });
      }

      alert("Recuperação registrada com sucesso!\nEste imóvel foi removido da lista de pendentes.");
      window.location.href = "pendentes.html";

    } else {
      // Registro normal de campo
      await sync.salvarRegistro(registro);

      alert("Registro salvo com sucesso!");

      // FIX 1: Reset completo do formulário E disparo do evento change
      // para que atualizarTipo() desbloqueie o bloco de vistoria
      form.reset();

      // Dispara change no select de tipo para sincronizar estado visual
      const tipoSelect = document.getElementById("tipoImovel");
      if (tipoSelect) {
        tipoSelect.dispatchEvent(new Event("change"));
      }
      // Dispara input nos campos de tubitos para limpar preview
      ["amIni", "amFim"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dispatchEvent(new Event("input"));
      });
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