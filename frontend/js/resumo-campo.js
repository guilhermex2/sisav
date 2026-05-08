import { db } from "./db.js";

const API_BASE_URL = "https://sisav-api.onrender.com";

// ══════════════════════════════════════════════════════════════
// 🔧 Helpers
// ══════════════════════════════════════════════════════════════

const n   = (v) => parseInt(v, 10) || 0;
const el  = (id) => document.getElementById(id);
const set = (id, val) => { const e = el(id); if (e) e.textContent = val ?? 0; };

/** Retorna true se o tipo de imóvel é Residência (R ou R-F) */
const isResidencia = (t) => /^R(-F)?$/i.test(t);
const isComercio   = (t) => /^C(-F)?$/i.test(t);
const isTB         = (t) => /^TB(-F)?$/i.test(t);
const isPE         = (t) => /^PE(-F)?$/i.test(t);
/** Fechado = qualquer tipo com sufixo -F */
const isFechado    = (t) => /^.+-F$/i.test(t);
/** Recusa — campo informacao contém "recusa" (case-insensitive) */
const isRecusa     = (r) => /recusa/i.test(r.informacao || "");

// ══════════════════════════════════════════════════════════════
// 📊 Cálculo do resumo a partir dos registros do Dexie
// ══════════════════════════════════════════════════════════════

function calcularResumo(todosRegistros) {
  const registros    = todosRegistros.filter(r => !r.is_recuperacao);
  const recuperacoes = todosRegistros.filter(r =>  r.is_recuperacao);

  // ── Imóveis por tipo ──────────────────────────────────────
  const imoveis = { residencia: 0, comercio: 0, tb: 0, pe: 0, outra: 0 };

  // ── Situação dos imóveis ──────────────────────────────────
  let tratFocal     = 0;
  let tratPerifocal = 0;
  let inspecionados = registros.length;
  let recuperados   = recuperacoes.length;

  // ── Pendências ────────────────────────────────────────────
  let pendRecusa   = 0;
  let pendFechados = 0;

  // ── Depósitos ─────────────────────────────────────────────
  let depEliminado    = 0;
  let larvQtdeGramas  = 0;
  let larvQtdeDep     = 0;

  // ── Tubitos ───────────────────────────────────────────────
  let tubitos = 0;

  // ── Depósitos por tipo ────────────────────────────────────
  const depTipo = { a1:0, a2:0, b:0, c:0, d1:0, d2:0, e:0 };

  // ── Quarteirões ───────────────────────────────────────────
  // Mapa: "quarteirao_sequencia" → { trabalhado: bool, concluido: bool }
  // Um quarteirão é "trabalhado" se tem ao menos 1 registro nele.
  // Um quarteirão é "concluído" se todos os seus imóveis foram inspecionados
  // (nenhum pendente = sem fechados sem recuperação naquele quarteirão).
  const quartMap = new Map();

  registros.forEach(r => {
    const tipo = String(r.tipo_imovel || "").toUpperCase();

    // Tipo de imóvel
    if      (isResidencia(tipo)) imoveis.residencia++;
    else if (isComercio(tipo))   imoveis.comercio++;
    else if (isTB(tipo))         imoveis.tb++;
    else if (isPE(tipo))         imoveis.pe++;
    else                         imoveis.outra++;

    // Fechados / recusa
    if (isFechado(tipo)) pendFechados++;
    if (isRecusa(r))     pendRecusa++;

    // Trat. focal = im_trat marcado como X/true
    const imTrat = r.im_trat === true || String(r.im_trat).toUpperCase() === "X";
    if (imTrat) {
      tratFocal++;
      larvQtdeGramas += n(r.queda_gramas);
      larvQtdeDep    += n(r.qtd_dep_trat);
    }

    // Trat. perifocal = insp_l1 marcado como X/true
    const inspL1 = r.insp_l1 === true || String(r.insp_l1).toUpperCase() === "X";
    if (inspL1) tratPerifocal++;

    // Depósitos eliminados
    depEliminado += n(r.depositos_eliminados);

    // Tubitos
    tubitos += n(r.qtd_tubitos);

    // Depósitos por tipo (acumula todos os campos)
    depTipo.a1 += n(r.a1);
    depTipo.a2 += n(r.a2);
    depTipo.b  += n(r.b);
    depTipo.c  += n(r.c);
    depTipo.d1 += n(r.d1);
    depTipo.d2 += n(r.d2);
    depTipo.e  += n(r.e);

    // Quarteirões trabalhados
    const q = r.quarteirao;
    const s = r.sequencia;
    if (q) {
      const key = `${q}`;
      if (!quartMap.has(key)) {
        quartMap.set(key, { quarteirao: q, sequencia: s, temPendente: false });
      }
      // Se tem imóvel fechado neste quarteirão → ainda pendente
      if (isFechado(tipo)) {
        quartMap.get(key).temPendente = true;
      }
    }
  });

  // Monta arrays de quarteirões
  const quartTrabalhados = [];
  const quartConcluidos  = [];

  // Ordena por número do quarteirão
  const quartOrdenados = [...quartMap.values()].sort((a, b) =>
    String(a.quarteirao).localeCompare(String(b.quarteirao), undefined, { numeric: true })
  );

  quartOrdenados.forEach(q => {
    const label = q.sequencia ? `${q.quarteirao}/${q.sequencia}` : String(q.quarteirao);
    quartTrabalhados.push(label);
    if (!q.temPendente) quartConcluidos.push(label);
  });

  const depTipoTotal = depTipo.a1 + depTipo.a2 + depTipo.b + depTipo.c
                     + depTipo.d1 + depTipo.d2 + depTipo.e;

  return {
    imoveis: {
      ...imoveis,
      total: imoveis.residencia + imoveis.comercio + imoveis.tb + imoveis.pe + imoveis.outra
    },
    tratFocal,
    tratPerifocal,
    inspecionados,
    recuperados,
    pendRecusa,
    pendFechados,
    depEliminado,
    larvQtdeGramas,
    larvQtdeDep,
    tubitos,
    depTipo: { ...depTipo, total: depTipoTotal },
    quartTrabalhados,
    quartConcluidos,
  };
}

// ══════════════════════════════════════════════════════════════
// 🖥️ Preenche o HTML com os dados calculados
// ══════════════════════════════════════════════════════════════

function preencherHTML(turno, resumo) {
  // Cabeçalho
  set("dataDisplay",   new Date(turno.data).toLocaleDateString("pt-BR"));
  set("bairroDisplay", turno.localidade || "Não informado");
  set("agenteDisplay", turno.nomeAgente || turno.agente || "—");

  // Bloco 1 — Imóveis por tipo
  set("imov-residencia", resumo.imoveis.residencia);
  set("imov-comercio",   resumo.imoveis.comercio);
  set("imov-tb",         resumo.imoveis.tb);
  set("imov-pe",         resumo.imoveis.pe);
  set("imov-outra",      resumo.imoveis.outra);
  set("imov-total",      resumo.imoveis.total);

  // Bloco 2 — Situação & Pendências
  set("imov-trat-focal",     resumo.tratFocal);
  set("imov-trat-perifocal", resumo.tratPerifocal);
  set("imov-inspecionados",  resumo.inspecionados);
  set("imov-recuperados",    resumo.recuperados);
  set("tubitos-amostras",    resumo.tubitos);
  set("pend-recusa",         resumo.pendRecusa);
  set("pend-fechados",       resumo.pendFechados);

  // Bloco 3 — Depósitos
  set("dep-eliminado",     resumo.depEliminado);
  set("dep-larv1-tipo",    resumo.larvQtdeDep > 0 ? "Temefós" : "—");
  set("dep-larv1-qtde-g",  resumo.larvQtdeGramas);
  set("dep-larv1-qtde-dep", resumo.larvQtdeDep);

  // Bloco 4 — Depósitos por tipo
  set("dep-a1",         resumo.depTipo.a1);
  set("dep-a2",         resumo.depTipo.a2);
  set("dep-b",          resumo.depTipo.b);
  set("dep-c",          resumo.depTipo.c);
  set("dep-d1",         resumo.depTipo.d1);
  set("dep-d2",         resumo.depTipo.d2);
  set("dep-e",          resumo.depTipo.e);
  set("dep-tipo-total", resumo.depTipo.total);

  // Bloco 5 — Quarteirões
  renderQuarteiroes("q-trab-row1", "q-trab-row2", resumo.quartTrabalhados, "filled");
  renderQuarteiroes("q-conc-row1", "q-conc-row2", resumo.quartConcluidos,  "concluido");
}

// ══════════════════════════════════════════════════════════════
// 🗺️ Renderiza as linhas da tabela de quarteirões
// ══════════════════════════════════════════════════════════════

function renderQuarteiroes(rowId1, rowId2, valores = [], cssClass = "filled") {
  const row1 = el(rowId1);
  const row2 = el(rowId2);
  if (!row1 || !row2) return;

  row1.innerHTML = "";
  row2.innerHTML = "";

  // Sempre 10 colunas por linha (20 slots no total)
  for (let i = 0; i < 20; i++) {
    const td  = document.createElement("td");
    const val = valores[i];
    td.className   = val ? cssClass : "";
    td.textContent = val || "";
    (i < 10 ? row1 : row2).appendChild(td);
  }
}

// ══════════════════════════════════════════════════════════════
// 📡 Finalizar turno na API
// ══════════════════════════════════════════════════════════════

async function enviarParaAPI(turno) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado. Faça login novamente.");

  const response = await fetch(`${API_BASE_URL}/api/turnos/finalizar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      agenteId: Number(turno.agenteId),
      data:     turno.data,
    }),
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.message || `Erro na API: ${response.status}`);
  }

  return response.json();
}

// ══════════════════════════════════════════════════════════════
// 📄 Gera PDF do resumo
// ══════════════════════════════════════════════════════════════

async function gerarPDF(turno, resumo, registros) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdf.setFontSize(14);
  pdf.text("SISAV - Relatório Diário de Campo", 14, 15);

  pdf.setFontSize(10);
  pdf.text(`Data: ${new Date(turno.data).toLocaleDateString("pt-BR")}`, 14, 25);
  pdf.text(`Localidade: ${turno.localidade || "Não informado"}`,        14, 32);
  pdf.text(`Agente: ${turno.nomeAgente || turno.agente || "—"}`,        14, 39);

  pdf.autoTable({
    startY: 46,
    head: [["Campo", "Valor"]],
    body: [
      ["Imóveis inspecionados", resumo.inspecionados],
      ["Residências",           resumo.imoveis.residencia],
      ["Comércio",              resumo.imoveis.comercio],
      ["Terreno Baldio (TB)",   resumo.imoveis.tb],
      ["Ponto Estratégico (PE)",resumo.imoveis.pe],
      ["Outros",                resumo.imoveis.outra],
      ["Trat. Focal",           resumo.tratFocal],
      ["Trat. Perifocal",       resumo.tratPerifocal],
      ["Recuperados",           resumo.recuperados],
      ["Fechados (pendentes)",  resumo.pendFechados],
      ["Recusas",               resumo.pendRecusa],
      ["Depósitos eliminados",  resumo.depEliminado],
      ["Larvicida — Gramas",    resumo.larvQtdeGramas],
      ["Larvicida — Dep. trat.",resumo.larvQtdeDep],
      ["Tubitos coletados",     resumo.tubitos],
      ["Dep. A1", resumo.depTipo.a1], ["Dep. A2", resumo.depTipo.a2],
      ["Dep. B",  resumo.depTipo.b],  ["Dep. C",  resumo.depTipo.c],
      ["Dep. D1", resumo.depTipo.d1], ["Dep. D2", resumo.depTipo.d2],
      ["Dep. E",  resumo.depTipo.e],  ["Dep. Total", resumo.depTipo.total],
      ["Quarteirões trabalhados", resumo.quartTrabalhados.join(", ") || "—"],
      ["Quarteirões concluídos",  resumo.quartConcluidos.join(", ")  || "—"],
    ],
  });

  pdf.save(`SISAV_${turno.data}_${turno.localidade || "campo"}.pdf`);
}

// ══════════════════════════════════════════════════════════════
// 🚀 Inicialização principal
// ══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
  const btnFinalizar = el("btnFinalizar");
  const statusBadge  = el("statusBadge");
  const statusText   = el("statusText");

  try {
    // 1️⃣ Valida turno ativo
    const dataTurnoAtivo = localStorage.getItem("turnoAtivo");
    if (!dataTurnoAtivo) {
      alert("Nenhum turno ativo encontrado.");
      window.location.href = "turno.html";
      return;
    }

    const [data, agenteId] = dataTurnoAtivo.split("_");
    const turno = await db.turnos.get({ data, agenteId });

    if (!turno) {
      alert("Turno não encontrado.");
      window.location.href = "turno.html";
      return;
    }

    // 2️⃣ Turno já finalizado — exibe somente leitura
    if (turno.finalizadoEm) {
      statusBadge.classList.remove("andamento");
      statusBadge.classList.add("concluido");
      statusBadge.querySelector(".dot").style.animation = "none";
      statusText.textContent = "Concluído";
      btnFinalizar.disabled    = true;
      btnFinalizar.textContent = "✓ Turno Finalizado";
    }

    // 3️⃣ Busca registros e preenche resumo
    const todosRegistros = await db.registros
      .where("data_turno")
      .equals(turno.data)
      .toArray();

    const resumo = calcularResumo(todosRegistros);
    preencherHTML(turno, resumo);

    // 4️⃣ Atualização automática a cada 30 s (útil enquanto o turno está ativo)
    if (!turno.finalizadoEm) {
      setInterval(async () => {
        const atualizados = await db.registros
          .where("data_turno")
          .equals(turno.data)
          .toArray();
        preencherHTML(turno, calcularResumo(atualizados));
      }, 30_000);
    }

    // 5️⃣ Botão finalizar
    btnFinalizar.addEventListener("click", async () => {
      if (!confirm("Deseja finalizar este turno?")) return;

      btnFinalizar.disabled    = true;
      btnFinalizar.textContent = "Finalizando...";

      try {
        const finalizadoEm = new Date().toISOString();

        // Recalcula resumo final
        const regFinal = await db.registros
          .where("data_turno")
          .equals(turno.data)
          .toArray();
        const resumoFinal = calcularResumo(regFinal);

        // Salva localmente
        await db.turnos.update(
          { data: turno.data, agenteId: turno.agenteId },
          { finalizadoEm, resumo: resumoFinal }
        );

        // Tenta sincronizar com a API
        try {
          await enviarParaAPI({ ...turno, finalizadoEm });
          console.log("✅ Turno finalizado na API.");
        } catch (erroAPI) {
          console.warn("⚠️ Erro ao finalizar na API:", erroAPI);
          alert(
            `Turno salvo localmente, mas houve erro ao sincronizar:\n\n${erroAPI.message}\n\nOs dados estão seguros no dispositivo.`
          );
        }

        // Gera PDF (só registros normais)
        const regNormais = regFinal.filter(r => !r.is_recuperacao);
        await gerarPDF(turno, resumoFinal, regNormais);

        localStorage.removeItem("turnoAtivo");

        statusBadge.classList.remove("andamento");
        statusBadge.classList.add("concluido");
        statusBadge.querySelector(".dot").style.animation = "none";
        statusText.textContent   = "Concluído";
        btnFinalizar.textContent = "✓ Turno Finalizado";

        alert("Turno finalizado com sucesso!");
        window.location.href = "turno.html";

      } catch (err) {
        console.error("Erro ao finalizar turno:", err);
        alert("Erro ao finalizar turno. Tente novamente.");
        btnFinalizar.disabled    = false;
        btnFinalizar.textContent = "✓ Confirmar e Finalizar Turno";
      }
    });

  } catch (err) {
    console.error("Erro no resumo:", err);
    alert("Erro ao carregar resumo. Verifique o banco de dados.");
  }
});