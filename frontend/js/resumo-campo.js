import { db } from "./db.js";

const API_BASE_URL = "https://sisav-api.onrender.com";

// 
//  Helpers
// 

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

// 
//  Cálculo do resumo a partir dos registros do Dexie
// 

function calcularResumo(todosRegistros) {
  const registros    = todosRegistros.filter(r => !r.is_recuperacao);
  const recuperacoes = todosRegistros.filter(r =>  r.is_recuperacao);

  const imoveis = { residencia: 0, comercio: 0, tb: 0, pe: 0, outra: 0 };

  let tratFocal     = 0;
  let tratPerifocal = 0;
  let inspecionados = registros.length;
  let recuperados   = recuperacoes.length;

  let pendRecusa   = 0;
  let pendFechados = 0;

  let depEliminado    = 0;
  let larvQtdeGramas  = 0;
  let larvQtdeDep     = 0;

  let tubitos = 0;

  const depTipo = { a1:0, a2:0, b:0, c:0, d1:0, d2:0, e:0 };

  const quartMap = new Map();

  registros.forEach(r => {
    const tipo = String(r.tipo_imovel || "").toUpperCase();

    if      (isResidencia(tipo)) imoveis.residencia++;
    else if (isComercio(tipo))   imoveis.comercio++;
    else if (isTB(tipo))         imoveis.tb++;
    else if (isPE(tipo))         imoveis.pe++;
    else                         imoveis.outra++;

    if (isFechado(tipo)) pendFechados++;
    if (isRecusa(r))     pendRecusa++;

    const imTrat = r.im_trat === true || String(r.im_trat).toUpperCase() === "X";
    if (imTrat) {
      tratFocal++;
      larvQtdeGramas += n(r.queda_gramas);
      larvQtdeDep    += n(r.qtd_dep_trat);
    }

    const inspL1 = r.insp_l1 === true || String(r.insp_l1).toUpperCase() === "X";
    if (inspL1) tratPerifocal++;

    depEliminado += n(r.depositos_eliminados);
    tubitos      += n(r.qtd_tubitos);

    depTipo.a1 += n(r.a1);
    depTipo.a2 += n(r.a2);
    depTipo.b  += n(r.b);
    depTipo.c  += n(r.c);
    depTipo.d1 += n(r.d1);
    depTipo.d2 += n(r.d2);
    depTipo.e  += n(r.e);

    const q = r.quarteirao;
    const s = r.sequencia;
    if (q) {
      const key = `${q}`;
      if (!quartMap.has(key)) {
        quartMap.set(key, { quarteirao: q, sequencia: s, temPendente: false });
      }
      if (isFechado(tipo)) {
        quartMap.get(key).temPendente = true;
      }
    }
  });

  const quartTrabalhados = [];
  const quartConcluidos  = [];

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

// 
//  Preenche o HTML com os dados calculados
// 

function preencherHTML(turno, resumo) {
  set("dataDisplay",   new Date(turno.data).toLocaleDateString("pt-BR"));
  set("bairroDisplay", turno.localidade || "Não informado");
  set("agenteDisplay", turno.nomeAgente || turno.agente || "—");

  set("imov-residencia", resumo.imoveis.residencia);
  set("imov-comercio",   resumo.imoveis.comercio);
  set("imov-tb",         resumo.imoveis.tb);
  set("imov-pe",         resumo.imoveis.pe);
  set("imov-outra",      resumo.imoveis.outra);
  set("imov-total",      resumo.imoveis.total);

  set("imov-trat-focal",     resumo.tratFocal);
  set("imov-trat-perifocal", resumo.tratPerifocal);
  set("imov-inspecionados",  resumo.inspecionados);
  set("imov-recuperados",    resumo.recuperados);
  set("tubitos-amostras",    resumo.tubitos);
  set("pend-recusa",         resumo.pendRecusa);
  set("pend-fechados",       resumo.pendFechados);

  set("dep-eliminado",      resumo.depEliminado);
  set("dep-larv1-tipo",     resumo.larvQtdeDep > 0 ? "Temefós" : "—");
  set("dep-larv1-qtde-g",   resumo.larvQtdeGramas);
  set("dep-larv1-qtde-dep", resumo.larvQtdeDep);

  set("dep-a1",         resumo.depTipo.a1);
  set("dep-a2",         resumo.depTipo.a2);
  set("dep-b",          resumo.depTipo.b);
  set("dep-c",          resumo.depTipo.c);
  set("dep-d1",         resumo.depTipo.d1);
  set("dep-d2",         resumo.depTipo.d2);
  set("dep-e",          resumo.depTipo.e);
  set("dep-tipo-total", resumo.depTipo.total);

  renderQuarteiroes("q-trab-row1", "q-trab-row2", resumo.quartTrabalhados, "filled");
  renderQuarteiroes("q-conc-row1", "q-conc-row2", resumo.quartConcluidos,  "concluido");
}

// 
//  Renderiza as linhas da tabela de quarteirões
// 

function renderQuarteiroes(rowId1, rowId2, valores = [], cssClass = "filled") {
  const row1 = el(rowId1);
  const row2 = el(rowId2);
  if (!row1 || !row2) return;

  row1.innerHTML = "";
  row2.innerHTML = "";

  for (let i = 0; i < 20; i++) {
    const td  = document.createElement("td");
    const val = valores[i];
    td.className   = val ? cssClass : "";
    td.textContent = val || "";
    (i < 10 ? row1 : row2).appendChild(td);
  }
}

// 
//  Finalizar turno na API
// 

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

// 
//  Gera PDF fiel ao layout do resumo_campo.html + tabela de imóveis
// Retorna Blob (sem disparar download diretamente)
// 

function gerarPDFBlob(turno, resumo, registros) {
  const { jsPDF } = window.jspdf;

  // ── Cores do design ──────────────────────────────────────
  const NAVY      = [26,  58,  92];
  const NAVY_MID  = [30,  73, 118];
  const NAVY_DARK = [15,  35,  60];
  const TEAL      = [13, 148, 136];
  const SLATE334  = [51,  65,  85];
  const WHITE     = [255,255,255];
  const SLATE_BG  = [241,245,249];
  const BLUE_BG   = [239,246,255];
  const BLUE_BD   = [147,197,253];
  const BLUE_TXT  = [29,  78, 216];
  const TEAL_BG   = [204,251,241];
  const TEAL_TXT  = [15, 118, 110];
  const RED_BG    = [255,241,242];
  const RED_TXT   = [185, 28,  28];
  const AMBER_BG  = [254,252,232];
  const AMBER_TXT = [133, 77,  14];
  const MUTED     = [100,116,139];
  const BORDER    = [203,213,225];

  const dataFmt = new Date(turno.data).toLocaleDateString("pt-BR");

  // 
  // PÁGINA 1 — RESUMO (portrait A4, 210×297 mm)
  // 
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W1  = pdf.internal.pageSize.getWidth();
  const H1  = pdf.internal.pageSize.getHeight();
  const M   = 12;

  // ── Helper: cabeçalho de seção ────────────────────────
  function sectionHeader(y, label, color = NAVY) {
    pdf.setFillColor(...color);
    pdf.rect(M, y, W1 - M * 2, 7, "F");
    pdf.setTextColor(...WHITE);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text(label, M + 3, y + 4.8);
    pdf.setTextColor(0, 0, 0);
    return y + 7;
  }

  // ── Helper: célula de valor ───────────────────────────
  function fieldCell(x, y, w, h, label, value, style = "default") {
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...MUTED);
    pdf.text(String(label).toUpperCase(), x, y - 1);
    const fills = {
      default: { bg: SLATE_BG,  bd: BORDER,           tx: NAVY_DARK  },
      accent:  { bg: BLUE_BG,   bd: BLUE_BD,           tx: BLUE_TXT   },
      teal:    { bg: TEAL_BG,   bd: [94, 234, 212],    tx: TEAL_TXT   },
      dark:    { bg: NAVY_DARK, bd: NAVY_DARK,          tx: WHITE      },
      red:     { bg: RED_BG,    bd: [252, 165, 165],   tx: RED_TXT    },
      amber:   { bg: AMBER_BG,  bd: [253, 224, 71],    tx: AMBER_TXT  },
    };
    const s = fills[style] || fills.default;
    pdf.setFillColor(...s.bg);
    pdf.setDrawColor(...s.bd);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, w, h, "FD");
    pdf.setTextColor(...s.tx);
    pdf.setFontSize(style === "dark" ? 9 : 8);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(value ?? 0), x + w / 2, y + h / 2 + 2.8, { align: "center" });
    pdf.setTextColor(0, 0, 0);
  }

  // ── Helper: rodapé ────────────────────────────────────
  function addFooter(doc, pageNum, totalPages, pageH, pageW) {
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`SISAV · Relatorio Diario · ${dataFmt}`, M, pageH - 5);
    doc.text(`Pagina ${pageNum} de ${totalPages}`, pageW - M, pageH - 5, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  // ── HEADER ──────────────────────────────────────────
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, W1, 26, "F");
  pdf.setTextColor(...WHITE);
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("SISAV - SERVICO ANTIVETORIAL", M, 7);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Resumo do Trabalho de Campo", M, 14);

  const statusLabel = turno.finalizadoEm ? "CONCLUIDO" : "EM ANDAMENTO";
  const statusColor = turno.finalizadoEm ? TEAL : [217, 119, 6];
  pdf.setFillColor(...statusColor);
  pdf.roundedRect(W1 - M - 34, 7, 34, 9, 2, 2, "F");
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...WHITE);
  pdf.text(statusLabel, W1 - M - 17, 13, { align: "center" });

  pdf.setTextColor(191, 219, 254);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${dataFmt}  |  ${turno.localidade || "-"}  |  ${turno.nomeAgente || turno.agente || "-"}`, M, 22);
  pdf.setTextColor(0, 0, 0);

  let y = 32;

  // ── BLOCO 1: Nº Imóveis por tipo ────────────────────
  y = sectionHeader(y, "IMOVEIS TRABALHADOS POR TIPO");
  y += 6;

  const tipoLabels = ["Residencia", "Comercio", "TB", "PE", "Outra", "Total"];
  const tipoValues = [
    resumo.imoveis.residencia, resumo.imoveis.comercio,
    resumo.imoveis.tb, resumo.imoveis.pe, resumo.imoveis.outra,
    resumo.imoveis.total,
  ];
  const tipoStyles = ["accent", "accent", "accent", "accent", "accent", "dark"];
  const colW1 = (W1 - M * 2 - 2) / 6;
  const cellH = 9;

  tipoLabels.forEach((lbl, i) => {
    fieldCell(M + i * colW1, y, colW1 - 1, cellH, lbl, tipoValues[i], tipoStyles[i]);
  });

  y += cellH + 2;
  pdf.setFontSize(6);
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.text("TB - Terreno baldio    PE - Ponto estrategico", M, y);
  pdf.setTextColor(0, 0, 0);
  y += 6;

  // ── BLOCO 2: Situação & Pendências ──────────────────
  y = sectionHeader(y, "SITUACAO DOS IMOVEIS & PENDENCIAS", NAVY_MID);
  y += 6;

  const BW    = W1 - M * 2;
  const col2A = BW * 0.54;
  const col2B = BW * 0.22;
  const col2C = BW * 0.24;
  const xB    = M + col2A + 2;
  const xC    = xB + col2B + 2;
  const rowH2 = 9;

  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...MUTED);
  pdf.text("N IMOVEIS", M, y - 1);
  pdf.text("TUBITOS / AMOSTRAS", xB, y - 1);
  pdf.text("PENDENCIA", xC, y - 1);
  pdf.setTextColor(0, 0, 0);

  const halfA = (col2A - 2) / 2;
  fieldCell(M,          y,             halfA - 1, rowH2, "Trat. Focal",     resumo.tratFocal     ?? 0, "default");
  fieldCell(M + halfA,  y,             halfA - 1, rowH2, "Trat. Perifocal", resumo.tratPerifocal ?? 0, "default");
  fieldCell(M,          y + rowH2 + 2, halfA - 1, rowH2, "Inspecionados",   resumo.inspecionados ?? 0, "accent");
  fieldCell(M + halfA,  y + rowH2 + 2, halfA - 1, rowH2, "Recuperados",     resumo.recuperados   ?? 0, "teal");

  const tubitosH = rowH2 * 2 + 2;
  pdf.setFillColor(...SLATE_BG);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.3);
  pdf.rect(xB, y, col2B - 2, tubitosH, "FD");
  pdf.setTextColor(...NAVY_DARK);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(String(resumo.tubitos ?? 0), xB + (col2B - 2) / 2, y + tubitosH / 2 + 2, { align: "center" });
  pdf.setFontSize(5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...MUTED);
  pdf.text("COLETADAS", xB + (col2B - 2) / 2, y + tubitosH - 2, { align: "center" });
  pdf.setTextColor(0, 0, 0);

  fieldCell(xC, y,             col2C - 1, rowH2, "Recusa",   resumo.pendRecusa   ?? 0, "red");
  fieldCell(xC, y + rowH2 + 2, col2C - 1, rowH2, "Fechados", resumo.pendFechados ?? 0, "amber");
  y += tubitosH + 6;

  // ── BLOCO 3: Depósitos ──────────────────────────────
  y = sectionHeader(y, "DEPOSITOS");
  pdf.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [
      [
        { content: "Eliminado", rowSpan: 2, styles: { valign: "middle" } },
        { content: "Tratados - Larvicida", colSpan: 3, styles: { halign: "center" } },
      ],
      ["Tipo", "Qtde. (gramas)", "Qtde. dep. trat."],
    ],
    body: [[
      resumo.depEliminado ?? 0,
      (resumo.larvQtdeDep ?? 0) > 0 ? "Temefos" : "-",
      resumo.larvQtdeGramas ?? 0,
      resumo.larvQtdeDep ?? 0,
    ]],
    styles:     { fontSize: 7.5, cellPadding: 3, halign: "center", valign: "middle" },
    headStyles: { fillColor: [248,250,252], textColor: MUTED, fontStyle: "bold", fontSize: 6.5, lineColor: BORDER, lineWidth: 0.3 },
    bodyStyles: { fillColor: SLATE_BG, fontStyle: "bold", lineColor: BORDER, lineWidth: 0.3 },
    columnStyles: { 0:{cellWidth:30}, 1:{cellWidth:40}, 2:{cellWidth:50}, 3:{cellWidth:50} },
    tableLineColor: BORDER, tableLineWidth: 0.3,
  });
  y = pdf.lastAutoTable.finalY + 4;

  // ── BLOCO 4: Nº Depósitos por tipo ──────────────────
  y = sectionHeader(y, "N DEPOSITOS INSPECIONADOS POR TIPO", SLATE334);
  pdf.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [["A1", "A2", "B", "C", "D1", "D2", "E", "Total"]],
    body: [[
      resumo.depTipo.a1 ?? 0, resumo.depTipo.a2 ?? 0, resumo.depTipo.b ?? 0,
      resumo.depTipo.c  ?? 0, resumo.depTipo.d1 ?? 0, resumo.depTipo.d2 ?? 0,
      resumo.depTipo.e  ?? 0, resumo.depTipo.total ?? 0,
    ]],
    styles:     { fontSize: 8, cellPadding: 3, halign: "center", valign: "middle" },
    headStyles: { fillColor: [248,250,252], textColor: MUTED, fontStyle: "bold", fontSize: 7, lineColor: BORDER, lineWidth: 0.3 },
    bodyStyles: { fillColor: SLATE_BG, fontStyle: "bold", lineColor: BORDER, lineWidth: 0.3 },
    columnStyles: { 7: { fillColor: NAVY_DARK, textColor: WHITE, fontStyle: "bold" } },
    tableLineColor: BORDER, tableLineWidth: 0.3,
  });
  y = pdf.lastAutoTable.finalY + 4;

  // ── BLOCO 5: Quarteirões ─────────────────────────────
  y = sectionHeader(y, "QUARTEIRAO", SLATE334);
  y += 3;

  function quartRow(startY, label, valores, colorBg, colorBd, colorTx) {
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...MUTED);
    pdf.text(label.toUpperCase(), M, startY);
    startY += 2;
    const qW  = (W1 - M * 2) / 10;
    const qH  = 7;
    const all = [...(valores || []), ...Array(20).fill("")].slice(0, 20);
    [0, 1].forEach(row => {
      for (let col = 0; col < 10; col++) {
        const val = all[row * 10 + col];
        const hasFill = val !== "";
        pdf.setFillColor(...(hasFill ? colorBg : SLATE_BG));
        pdf.setDrawColor(...(hasFill ? colorBd : BORDER));
        pdf.setLineWidth(0.3);
        pdf.rect(M + col * qW, startY + row * (qH + 0.5), qW, qH, "FD");
        if (hasFill) {
          pdf.setTextColor(...colorTx);
          pdf.setFontSize(6.5);
          pdf.setFont("helvetica", "bold");
          pdf.text(String(val), M + col * qW + qW / 2, startY + row * (qH + 0.5) + qH / 2 + 2, { align: "center" });
          pdf.setTextColor(0, 0, 0);
        }
      }
    });
    return startY + 2 * (qH + 0.5) + 4;
  }

  y = quartRow(y, "N e seq. dos quarteiraos trabalhados", resumo.quartTrabalhados, BLUE_BG, BLUE_BD, BLUE_TXT);
  y = quartRow(y, "N e seq. dos quarteiraos concluidos",  resumo.quartConcluidos,  TEAL_BG, [94,234,212], TEAL_TXT);

  // ── Rodapés página 1 ────────────────────────────────
  // (total de páginas só é calculado após a tabela, então voltamos depois)

  // 
  // PÁGINA 2+ — TABELA DE IMÓVEIS (landscape A4, 297×210 mm)
  // Página separada com orientação diferente via addPage
  // 
  pdf.addPage("a4", "landscape");
  const W2 = pdf.internal.pageSize.getWidth();   // 297 mm
  const H2 = pdf.internal.pageSize.getHeight();  // 210 mm
  const M2 = 8;

  // Mini-header
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, W2, 14, "F");
  pdf.setTextColor(...WHITE);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("SISAV - Tabela de Imoveis Registrados", M2, 9);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(191, 219, 254);
  pdf.text(
    `${dataFmt}  |  ${turno.localidade || "-"}  |  ${turno.nomeAgente || turno.agente || "-"}  |  ${registros.length} registro(s)`,
    W2 - M2, 9, { align: "right" }
  );
  pdf.setTextColor(0, 0, 0);

  function rowStyle(r) {
    const tipo = String(r.tipo_imovel || "").toUpperCase();
    const info = String(r.informacao  || "").toLowerCase();
    if (info.includes("recusa"))  return [255, 241, 242];
    if (tipo.endsWith("-F"))      return [255, 253, 232];
    if (r.is_recuperacao)         return [240, 253, 244];
    return null;
  }

  // Largura total útil em landscape: 297 - 2*8 = 281 mm
  // 24 colunas distribuídas para caber exatamente
  pdf.autoTable({
    startY: 16,
    margin: { left: M2, right: M2 },
    head: [
      [
        { content: "Identificacao do Imovel", colSpan: 8,  styles: { halign: "center", fillColor: [15,41,66], textColor: [147,197,253] } },
        { content: "Depositos Inspecionados",  colSpan: 7,  styles: { halign: "center", fillColor: [15,41,66], textColor: [147,197,253] } },
        { content: "Amostras / Tubitos",       colSpan: 4,  styles: { halign: "center", fillColor: [15,41,66], textColor: [147,197,253] } },
        { content: "Larvicida (Trat. Focal)",  colSpan: 3,  styles: { halign: "center", fillColor: [15,41,66], textColor: [147,197,253] } },
        { content: "Observacao",               colSpan: 1,  styles: { halign: "center", fillColor: [15,41,66], textColor: [147,197,253] } },
      ],
      [
        // Identificação: 8 cols (#, Qrt, Lado, Logradouro, Nº, Seq, Compl, Tipo, Hor) → removemos Horário do grupo pois estava sobrando
        "#", "Qrt.", "Lado", "Logradouro", "Nr", "Seq", "Tipo", "Horario",
        // Depósitos: 7
        "A1", "A2", "B", "C", "D1", "D2", "E",
        // Amostras: 4
        "D.Elim", "T.Per.", "Tb.In.", "Tb.Fin.",
        // Larvicida: 3
        "T.Foc.", "Larv.g", "D.Tr.",
        // Obs: 1
        "Informacao",
      ],
    ],
    body: registros.map((r, i) => [
      i + 1,
      r.quarteirao        ?? "-",
      r.lado              || "-",
      r.logradouro        || "-",
      r.numero            || "-",
      r.sequencia         || "-",
      r.tipo_imovel       || "-",
      r.horario_entrada   || "-",
      r.a1 ?? "-", r.a2 ?? "-", r.b ?? "-", r.c ?? "-",
      r.d1 ?? "-", r.d2 ?? "-", r.e ?? "-",
      r.depositos_eliminados ?? "-",
      (r.insp_l1 === true || String(r.insp_l1).toUpperCase() === "X") ? "X" : "-",
      r.amostra_inicial   ?? "-",
      r.amostra_final     ?? "-",
      (r.im_trat === true || String(r.im_trat).toUpperCase() === "X") ? "X" : "-",
      r.queda_gramas      ?? "-",
      r.qtd_dep_trat      ?? "-",
      r.informacao        || "-",
    ]),
    styles: {
      fontSize: 6,
      cellPadding: 1.8,
      halign: "center",
      valign: "middle",
      overflow: "ellipsize",
      lineColor: BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 6,
      halign: "center",
      lineColor: BORDER,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    bodyStyles: { lineColor: BORDER, lineWidth: 0.2 },
    columnStyles: {
      0:  { cellWidth: 6,    halign: "center" }, // #
      1:  { cellWidth: 12,   halign: "center" }, // Qrt.
      2:  { cellWidth: 8,    halign: "center" }, // Lado
      3:  { cellWidth: 38,   halign: "left"   }, // Logradouro — mais espaço
      4:  { cellWidth: 9,    halign: "center" }, // Nr
      5:  { cellWidth: 8,    halign: "center" }, // Seq
      6:  { cellWidth: 10,   halign: "center" }, // Tipo
      7:  { cellWidth: 13,   halign: "center" }, // Horario
      8:  { cellWidth: 8,    halign: "center" }, // A1
      9:  { cellWidth: 8,    halign: "center" }, // A2
      10: { cellWidth: 8,    halign: "center" }, // B
      11: { cellWidth: 8,    halign: "center" }, // C
      12: { cellWidth: 8,    halign: "center" }, // D1
      13: { cellWidth: 8,    halign: "center" }, // D2
      14: { cellWidth: 8,    halign: "center" }, // E
      15: { cellWidth: 10,   halign: "center" }, // D.Elim
      16: { cellWidth: 9,    halign: "center" }, // T.Per.
      17: { cellWidth: 9,    halign: "center" }, // Tb.In.
      18: { cellWidth: 9,    halign: "center" }, // Tb.Fin.
      19: { cellWidth: 9,    halign: "center" }, // T.Foc.
      20: { cellWidth: 9,    halign: "center" }, // Larv.g
      21: { cellWidth: 9,    halign: "center" }, // D.Tr.
      22: { cellWidth: "auto", halign: "left" }, // Informacao — ocupa o restante
    },
    willDrawCell: (data) => {
      if (data.section !== "body") return;
      const r = registros[data.row.index];
      if (!r) return;
      const fc = rowStyle(r);
      if (fc) data.cell.styles.fillColor = fc;
    },
  });

  // ── Rodapés em todas as páginas ─────────────────────
  const totalPages = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    const isLandscape = p > 1;
    const pH = isLandscape ? H2 : H1;
    const pW = isLandscape ? W2 : W1;
    addFooter(pdf, p, totalPages, pH, pW);
  }

  return pdf.output("blob");
}

// 
// 💾 Salva o Blob do PDF no IndexedDB (historico_pdfs)
// 

async function salvarPDFNoHistorico(turno, pdfBlob, resumo) {
  await db.historico_pdfs.put({
    data:      turno.data,
    agenteId:  turno.agenteId,
    criadoEm:  new Date().toISOString(),
    localidade: turno.localidade || "",
    municipio:  turno.municipio  || "",
    nomeAgente: turno.nomeAgente || turno.agente || "",
    resumo,       // mantém o resumo junto para exibição no card do histórico
    pdfBlob,      // o Blob é suportado nativamente pelo IndexedDB
  });
}

// 
//  Limpa os dados do turno finalizado (registros + turno)
// 

async function limparDadosTurno(turno) {
  // Remove todos os registros de visita deste dia
  await db.registros.where("data_turno").equals(turno.data).delete();

  // Remove registros de recuperação deste dia
  await db.recuperacao.where("data_turno").equals(turno.data).delete();

  // Remove o turno em si (o PDF já está em historico_pdfs)
  await db.turnos.delete([turno.data, turno.agenteId]);
}

// 
//  Inicialização principal
// 

document.addEventListener("DOMContentLoaded", async () => {
  const btnFinalizar = el("btnFinalizar");
  const statusBadge  = el("statusBadge");
  const statusText   = el("statusText");

  try {
    //  Valida turno ativo
    const dataTurnoAtivo = localStorage.getItem("turnoAtivo");
    if (!dataTurnoAtivo) {
      Swal.fire({
        title: "Nenhum turno ativo",
        text: "Não há turno ativo para registrar imóveis.\nFaça login e inicie um turno para acessar esta página.",
        icon: "warning"
      }).then(() => {
        window.location.href = "turno.html";
      });
      return;
    }

    const [data, agenteId] = dataTurnoAtivo.split("_");
    const turno = await db.turnos.get({ data, agenteId });

    if (!turno) {
      Swal.fire({
        title: "Turno não encontrado",
        text: "O turno ativo não foi encontrado.\nFaça login e inicie um turno para acessar esta página.",
        icon: "warning"
      }).then(() => {
        window.location.href = "turno.html";
      });
      return;
    }

    //  Turno já finalizado — exibe somente leitura
    if (turno.finalizadoEm) {
      statusBadge.classList.remove("andamento");
      statusBadge.classList.add("concluido");
      statusBadge.querySelector(".dot").style.animation = "none";
      statusText.textContent = "Concluído";
      btnFinalizar.disabled    = true;
      btnFinalizar.textContent = "✓ Turno Finalizado";
    }

    //  Busca registros e preenche resumo
    const todosRegistros = await db.registros
      .where("data_turno")
      .equals(turno.data)
      .toArray();

    const resumo = calcularResumo(todosRegistros);
    preencherHTML(turno, resumo);

    //  Atualização automática a cada 30 s
    if (!turno.finalizadoEm) {
      setInterval(async () => {
        const atualizados = await db.registros
          .where("data_turno")
          .equals(turno.data)
          .toArray();
        preencherHTML(turno, calcularResumo(atualizados));
      }, 30_000);
    }

    //  Botão finalizar
    btnFinalizar.addEventListener("click", async () => {
      if (!confirm("Deseja finalizar este turno?")) return;

      btnFinalizar.disabled    = true;
      btnFinalizar.textContent = "Finalizando...";

      try {
        const finalizadoEm = new Date().toISOString();

        // Recalcula resumo com os dados ainda no IndexedDB
        const regFinal = await db.registros
          .where("data_turno")
          .equals(turno.data)
          .toArray();
        const resumoFinal = calcularResumo(regFinal);

        // Salva o finalizadoEm e o resumo no turno (ainda existe neste ponto)
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
          Swal.fire({
            title: "Aviso de sincronização",
            text: `Turno salvo localmente, mas houve erro ao sincronizar:\n\n${erroAPI.message}\n\nOs dados estão seguros no dispositivo.`,
            icon: "warning"
          });
        }


        // Gera PDF como Blob (com todos os dados ainda presentes)
        btnFinalizar.textContent = "Gerando PDF...";
        const regNormais = regFinal.filter(r => !r.is_recuperacao);
        const pdfBlob = gerarPDFBlob(turno, resumoFinal, regNormais);

        // Dispara o download para o usuário
        const nomeArquivo = `SISAV_${turno.data}_${turno.localidade || "relatorio"}.pdf`;
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href     = url;
        link.download = nomeArquivo;
        link.click();
        URL.revokeObjectURL(url);

        // Salva o Blob no IndexedDB (historico_pdfs)
        btnFinalizar.textContent = "Salvando histórico...";
        await salvarPDFNoHistorico(turno, pdfBlob, resumoFinal);

        // Limpa os dados do turno (registros + turno) — o PDF já está salvo
        await limparDadosTurno(turno);
        // ─────────────────────────────────────────────────────────

        localStorage.removeItem("turnoAtivo");

        statusBadge.classList.remove("andamento");
        statusBadge.classList.add("concluido");
        statusBadge.querySelector(".dot").style.animation = "none";
        statusText.textContent   = "Concluído";
        btnFinalizar.textContent = "✓ Turno Finalizado";

        Swal.fire({
          title: "Turno finalizado com sucesso!",
          text: "O PDF foi baixado e o histórico foi salvo no dispositivo.",
          icon: "success"
        }).then(() => {
          window.location.href = "turno.html";
        });

      } catch (err) {
        console.error("Erro ao finalizar turno:", err);
        Swal.fire({
          title: "Erro ao finalizar turno",
          text: "Houve um erro ao finalizar o turno. Tente novamente.",
          icon: "error"
        });
        btnFinalizar.disabled    = false;
        btnFinalizar.textContent = "✓ Confirmar e Finalizar Turno";
      }
    });

  } catch (err) {
    console.error("Erro no resumo:", err);
    Swal.fire({
      title: "Erro ao carregar resumo",
      text: "Houve um erro ao carregar os dados do turno. Verifique o banco de dados.",
      icon: "error"
    });
  }
});