// campo.js
/*
Script para salvar os Imóveis durante o dia no campo.
Todos os registros são salvos no IndexedDB.

Se a página for aberta com ?recuperacao=1, os dados do imóvel
fechado são pré-preenchidos via sessionStorage e o registro é
salvo com is_recuperacao: true (não entra na soma do resumo).
*/
import { db } from "./db.js";

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
  // Detecta se veio da tela de Pendentes
  const params       = new URLSearchParams(window.location.search);
  const modoRecuperacao = params.get("recuperacao") === "1";
  const dadosPendente   = modoRecuperacao
    ? JSON.parse(sessionStorage.getItem("recuperacao_imovel") || "null")
    : null;

  if (modoRecuperacao && dadosPendente) {
    // Pré-preenche os campos de endereço no formulário
    preencherCampo("logradouro",  dadosPendente.logradouro);
    preencherCampo("numero",      dadosPendente.numero);
    preencherCampo("complemento", dadosPendente.complemento);
    preencherCampo("quarteirao",  dadosPendente.quarteirao);
    preencherCampo("sequencia",   dadosPendente.sequencia);
    preencherCampo("lado",        dadosPendente.lado);

    // Aviso visual para o agente saber que está em modo recuperação
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

    // Se for recuperação, marca a flag e limpa o sessionStorage
    if (modoRecuperacao && dadosPendente) {
      registro.is_recuperacao = true;
      sessionStorage.removeItem("recuperacao_imovel");
    }

    await db.registros.add(registro);

    if (modoRecuperacao) {
      alert("Recuperação registrada com sucesso!\nEste imóvel foi removido da lista de pendentes.");
      // Volta para pendentes após salvar a recuperação
      window.location.href = "pendentes.html";
    } else {
      alert("Registro salvo com sucesso!");
      form.reset();
    }
  });
});

// ── HELPERS ───────────────────────────────────────────────────

/**
 * Preenche um campo do formulário pelo name ou id.
 * Funciona com <input>, <select> e <textarea>.
 */
function preencherCampo(nome, valor) {
  if (valor === undefined || valor === null) return;
  const el = document.querySelector(`[name="${nome}"], #${nome}`);
  if (el) el.value = valor;
}

/**
 * Injeta um banner de aviso no topo do formulário indicando
 * que o agente está no modo de recuperação de imóvel fechado.
 */
function exibirAvisoRecuperacao(dadosPendente) {
  const endereco = [
    dadosPendente.logradouro,
    dadosPendente.numero,
    dadosPendente.complemento
  ].filter(Boolean).join(", ");

  const aviso = document.createElement("div");
  aviso.id = "aviso-recuperacao";
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

  // Insere antes do primeiro elemento do formulário
  const form = document.getElementById("registroForm");
  form.insertBefore(aviso, form.firstChild);
}