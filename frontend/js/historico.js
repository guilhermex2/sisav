import { db } from "./db.js";
import { SyncManager } from "./sync-manager.js";

const API_BASE_URL = "https://sisav-api.onrender.com";

// SyncManager para forçar sync dos pendentes antes de finalizar
const sync = new SyncManager({
  apiUrl:     API_BASE_URL,
  endpoint:   "/sync/dados",
  onSyncErro: (err) => console.warn("[Sync] Falha:", err.message),
});
sync.init();

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await carregarHistorico();
  } catch (error) {
    console.error("Erro no carregamento do histórico:", error);
  }
});


//  Carrega e exibe os PDFs salvos em historico_pdfs
// 

async function carregarHistorico() {
  const lista    = document.getElementById("listaTurnos");
  const semDados = document.getElementById("semDados");

  // Busca todos os PDFs salvos, do mais recente ao mais antigo
  const historico = await db.historico_pdfs
    .orderBy("criadoEm")
    .reverse()
    .toArray();

  // Verifica se ainda há turnos antigos que não passaram pela nova lógica
  // (turnos finalizados antes da migração, que ainda têm dados em db.turnos)
  const turnosLegados = await db.turnos
    .where("finalizadoEm")
    .above("")
    .reverse()
    .toArray();

  // Filtra turnos legados que ainda não têm PDF salvo em historico_pdfs
  // para exibi-los com aviso de regeneração
  const keysComPDF = new Set(historico.map(h => `${h.data}_${h.agenteId}`));
  const turnosLegadosSemPDF = turnosLegados.filter(
    t => !keysComPDF.has(`${t.data}_${t.agenteId}`)
  );

  const totalItens = historico.length + turnosLegadosSemPDF.length;

  if (totalItens === 0) {
    semDados.classList.remove("d-none");
    return;
  }

  // Renderiza PDFs do novo sistema (Blob salvo)
  historico.forEach(registro => {
    lista.appendChild(criarCardComPDF(registro));
  });

  // Renderiza turnos legados (dados ainda no IndexedDB, sem PDF salvo)
  turnosLegadosSemPDF.forEach(turno => {
    lista.appendChild(criarCardLegado(turno));
  });
}


//  Card para turno com PDF já salvo (novo sistema)
// 

function criarCardComPDF(registro) {
  const sincronizado = !!registro.sincronizadoEm;
  const card = document.createElement("div");
  card.className = "card shadow-sm";

  card.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h5 class="card-title mb-0">
          📅 ${new Date(registro.data).toLocaleDateString("pt-BR")}
        </h5>
        <div class="d-flex gap-2 align-items-center">
          <span class="badge bg-secondary" title="PDF salvo no dispositivo">📄 PDF salvo</span>
          <span class="badge ${sincronizado ? "bg-success" : "bg-warning text-dark"}">
            ${sincronizado ? "✔ Sincronizado" : "⚠ Pendente"}
          </span>
        </div>
      </div>

      <p class="card-text mb-1">📍 ${registro.localidade || "Não informado"}</p>
      <p class="card-text mb-1">👤 ${registro.nomeAgente || "Não informado"}</p>
      <p class="card-text text-muted small">
        ⏱ Gerado em: ${new Date(registro.criadoEm).toLocaleString("pt-BR")}
      </p>
      ${sincronizado ? `
        <p class="text-muted small mb-2">
          🔄 Sincronizado em: ${new Date(registro.sincronizadoEm).toLocaleString("pt-BR")}
        </p>` : ""}

      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-outline-primary btn-sm btn-visualizar">
          👁 Visualizar PDF
        </button>
        <button class="btn btn-primary btn-sm btn-baixar">
          📥 Baixar PDF
        </button>
      </div>
    </div>
  `;

  const nomeArquivo = `SISAV_${registro.data}_${registro.localidade || "relatorio"}.pdf`;

  // Visualizar (abre em nova aba)
  card.querySelector(".btn-visualizar").addEventListener("click", () => {
    const url = URL.createObjectURL(registro.pdfBlob);
    window.open(url, "_blank");
    // Revoga após 60 s para liberar memória
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  });

  // Baixar
  card.querySelector(".btn-baixar").addEventListener("click", () => {
    const url  = URL.createObjectURL(registro.pdfBlob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  });

  return card;
}


//  Card para turnos legados (dados ainda em db.registros)
//   Exibidos apenas enquanto ainda existirem no IndexedDB
// 

function criarCardLegado(turno) {
  const sincronizado = !!turno.sincronizadoEm;
  const card = document.createElement("div");
  card.className = "card shadow-sm border-warning";

  card.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h5 class="card-title mb-0">
          📅 ${new Date(turno.data).toLocaleDateString("pt-BR")}
        </h5>
        <div class="d-flex gap-2 align-items-center">
          <span class="badge bg-warning text-dark" title="Turno anterior à atualização do sistema">⚠ Legado</span>
          <span class="badge ${sincronizado ? "bg-success" : "bg-warning text-dark"}">
            ${sincronizado ? "✔ Sincronizado" : "⚠ Pendente"}
          </span>
        </div>
      </div>

      <p class="card-text mb-1">📍 ${turno.localidade || "Não informado"}</p>
      <p class="card-text mb-1">👤 ${turno.nomeAgente || turno.agente || "Não informado"}</p>
      <p class="card-text text-muted small">
        ⏱ Finalizado em: ${new Date(turno.finalizadoEm).toLocaleString("pt-BR")}
      </p>
      <p class="text-warning small mb-2">
        ⚠ Este turno foi salvo antes da atualização. Gere o PDF antes que os dados sejam removidos.
      </p>

      <div class="d-flex gap-2 mt-2 flex-wrap">
        <button class="btn btn-outline-success btn-sm btn-sync" ${sincronizado ? "disabled" : ""}>
          🔄 Sincronizar
        </button>
        <button class="btn btn-outline-primary btn-sm btn-pdf-legado">
          📄 Gerar e Salvar PDF
        </button>
      </div>
    </div>
  `;

  //  Sincronizar manual (lógica original mantida)
  card.querySelector(".btn-sync").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled    = true;
    btn.textContent = "Sincronizando...";

    try {
      if (!navigator.onLine) {
        throw new Error("Sem conexão com a internet. Tente novamente quando estiver online.");
      }

      const pendentes = await db.sync_fila.where("synced").equals(0).toArray();
      if (pendentes.length > 0) {
        btn.textContent = `Enviando ${pendentes.length} registro(s)...`;
        await new Promise((resolve, reject) => {
          const original = sync.onSyncOk;
          sync.onSyncOk = (ids) => {
            sync.onSyncOk = original;
            resolve(ids);
          };
          sync._sincronizar().catch(reject);
        });
      }

      btn.textContent = "Finalizando no servidor...";
      await marcarFinalizadoNaBanco(turno);

      const sincronizadoEm = new Date().toISOString();
      await db.turnos.update(
        { data: turno.data, agenteId: turno.agenteId },
        { sincronizadoEm }
      );

      btn.textContent = "✔ Sincronizado";
      btn.className   = "btn btn-success btn-sm btn-sync";

      const badge = card.querySelector(".badge");
      badge.className   = "badge bg-success";
      badge.textContent = "✔ Sincronizado";

    } catch (err) {
      console.error("Erro ao sincronizar:", err);
      Swal.fire({
        title: "Erro ao sincronizar",
        text: `Erro ao sincronizar:\n\n${err.message}`,
        icon: "error"
      });
      btn.disabled    = false;
      btn.textContent = "🔄 Sincronizar";
    }
  });

  //  Gera PDF do turno legado e salva no novo sistema
  card.querySelector(".btn-pdf-legado").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled    = true;
    btn.textContent = "Gerando...";

    try {
      const registros = await db.registros
        .where("data_turno")
        .equals(turno.data)
        .toArray();

      if (!registros.length) {
        throw new Error("Dados deste turno não estão mais disponíveis no dispositivo.");
      }

      const resumo = turno.resumo || {};
      const regNormais = registros.filter(r => !r.is_recuperacao);
      const pdfBlob = gerarPDFBlob(turno, resumo, regNormais);

      // Salva na nova store
      await db.historico_pdfs.put({
        data:       turno.data,
        agenteId:   turno.agenteId,
        criadoEm:   new Date().toISOString(),
        localidade: turno.localidade  || "",
        municipio:  turno.municipio   || "",
        nomeAgente: turno.nomeAgente  || turno.agente || "",
        resumo,
        pdfBlob,
      });

      // Dispara o download
      const nomeArquivo = `SISAV_${turno.data}_${turno.localidade || "relatorio"}.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = nomeArquivo;
      link.click();
      URL.revokeObjectURL(url);

      // Avisa e recarrega para o card migrar para o novo sistema
      await Swal.fire({
        title: "PDF salvo!",
        text: "O PDF foi gerado, baixado e salvo no histórico do dispositivo.",
        icon: "success"
      });
      window.location.reload();

    } catch (err) {
      console.error("Erro ao gerar PDF legado:", err);
      Swal.fire({
        title: "Erro ao gerar PDF",
        text: err.message || "Houve um erro ao gerar o PDF. Tente novamente.",
        icon: "error"
      });
      btn.disabled    = false;
      btn.textContent = "📄 Gerar e Salvar PDF";
    }
  });

  return card;
}


//  Geração de PDF como Blob (sem disparar download diretamente)
// 

function gerarPDFBlob(turno, resumo, registros) {
  const { jsPDF } = window.jspdf;

  // ── Cores do design 
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

  
  // PÁGINA 1 — RESUMO (portrait A4, 210×297 mm)
  // 
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W1  = pdf.internal.pageSize.getWidth();
  const H1  = pdf.internal.pageSize.getHeight();
  const M   = 12;

  //  Helper: cabeçalho de seção 
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

  // Helper: célula de valor 
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

  //  Helper: rodapé 
  function addFooter(doc, pageNum, totalPages, pageH, pageW) {
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`SISAV · Relatorio Diario · ${dataFmt}`, M, pageH - 5);
    doc.text(`Pagina ${pageNum} de ${totalPages}`, pageW - M, pageH - 5, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  // HEADER 
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

  //  BLOCO 1: Nº Imóveis por tipo 
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

  //  BLOCO 2: Situação & Pendências 
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

  //  BLOCO 3: Depósitos
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

  // BLOCO 4: Nº Depósitos por tipo 
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

  //  BLOCO 5: Quarteirões 
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

  //  Rodapés página 1 
  // (total de páginas só é calculado após a tabela, então voltamos depois)

  
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

  //  Rodapés em todas as páginas 
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


//  Marca turno como finalizado no servidor (turnos legados)
// 

async function marcarFinalizadoNaBanco(turno) {
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

  return await response.json();
}