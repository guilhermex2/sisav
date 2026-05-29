// registros.js
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
    Swal.fire({
      title: "Nenhum turno ativo",
      text: "Não há turno ativo para registrar imóveis.\nFaça login e inicie um turno para acessar esta página.",
      icon: "warning"
    }).then(() => {
      window.location.href = "turno.html";
    });

    return;
  }

  const data       = turnoAtivoKey.split("_")[0];
  const turnoAtivo = await db.turnos.get({ data, agenteId });

  if (!turnoAtivo || turnoAtivo.finalizadoEm) {
    Swal.fire({
      title: "Turno já finalizado",
      text: "Este turno já foi finalizado.",
      icon: "warning"
    }).then(() => {
      localStorage.removeItem("turnoAtivo");
      window.location.href = "turno.html";
    });
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
      agenteId:   Number(localStorage.getItem("agenteId")),
      criado_em:  new Date().toISOString(),
    };

    if (modoRecuperacao && dadosPendente) {
      registro.is_recuperacao = true;

      // 1. Salva a visita via sync (tipoVisita vira RECUPERACAO no backend)
      sync.salvarRegistro(registro);

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
          );
        } catch (err) {
          console.warn("[Recuperação] Falha ao atualizar status:", err.message);
        }
      }

      sessionStorage.removeItem("recuperacao_imovel");
      Swal.fire({
        title: "Recuperação registrada com sucesso!",
        text: "Este imóvel foi removido da lista de pendentes.",
        icon: "success"
      }).then(() => {
        window.location.href = "pendentes.html"
      })
      

    } else {
      // Registro normal de campo
      await sync.salvarRegistro(registro);

      Swal.fire({
        title: "Registro salvo com sucesso!",
        icon: "success"
      });

      form.reset();

      const tipoSelect = document.getElementById("tipoImovel");
      if (tipoSelect) tipoSelect.dispatchEvent(new Event("change"));

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
  const el = document.querySelector(`[name="${nome}"]`);
  if (el) el.value = valor;
}

function exibirAvisoRecuperacao(dadosPendente) {
  const endereco = [
    dadosPendente.logradouro,
    dadosPendente.numero,
    dadosPendente.complemento,
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