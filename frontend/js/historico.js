import { db } from "./db.js";

const LIMITE_DIAS = 1;
const API_BASE_URL = "https://sisav-api.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await limparHistoricoAntigo();
    await carregarHistorico();
  } catch (error) {
    console.error("Erro no carregamento do histórico:", error);
  }
});

async function limparHistoricoAntigo() {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - LIMITE_DIAS);

  const turnosAntigos = await db.turnos
    .where("finalizadoEm")
    .below(dataLimite.toISOString())
    .toArray();

  for (const turno of turnosAntigos) {
    await db.registros.where("data_turno").equals(turno.data).delete();
    await db.turnos.delete(turno.data);
  }
}

async function carregarHistorico() {
  const lista = document.getElementById("listaTurnos");
  const semDados = document.getElementById("semDados");

  const turnos = await db.turnos.where("finalizadoEm").above("").reverse().toArray();

  if (!turnos.length) {
    semDados.classList.remove("d-none");
    return;
  }

  turnos.forEach(turno => {
    const sincronizado = !!turno.sincronizadoEm;
    const card = document.createElement("div");
    card.className = "card shadow-sm";

    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h5 class="card-title mb-0">
            📅 ${new Date(turno.data).toLocaleDateString("pt-BR")}
          </h5>
          <span class="badge ${sincronizado ? "bg-success" : "bg-warning text-dark"}">
            ${sincronizado ? "✔ Sincronizado" : "⚠ Pendente"}
          </span>
        </div>

        <p class="card-text mb-1">📍 ${turno.localidade || "Não informado"}</p>
        <p class="card-text mb-1">👤 ${turno.nomeAgente || turno.agente || "Não informado"}</p>
        <p class="card-text text-muted small">
          ⏱ Finalizado em: ${new Date(turno.finalizadoEm).toLocaleString("pt-BR")}
        </p>
        ${sincronizado ? `
          <p class="text-muted small mb-2">
            🔄 Sincronizado em: ${new Date(turno.sincronizadoEm).toLocaleString("pt-BR")}
          </p>` : ""}

        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-outline-success btn-sm btn-sync" ${sincronizado ? "disabled" : ""}>
            🔄 Sincronizar
          </button>
          <button class="btn btn-outline-primary btn-sm btn-pdf">
            📄 Baixar PDF
          </button>
        </div>
      </div>
    `;

    // 🔄 Sincronizar
    card.querySelector(".btn-sync").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = "Sincronizando...";

      try {
        const registros = await db.registros
          .where("data_turno")
          .equals(turno.data)
          .toArray();

        await enviarParaAPI(turno, registros);

        const sincronizadoEm = new Date().toISOString();
        await db.turnos.update(
          { data: turno.data, agenteId: turno.agenteId },
          { sincronizadoEm }
        );

        btn.textContent = "✔ Sincronizado";
        btn.className = "btn btn-success btn-sm btn-sync";

        // Atualiza o badge sem recarregar a página
        const badge = card.querySelector(".badge");
        badge.className = "badge bg-success";
        badge.textContent = "✔ Sincronizado";

      } catch (err) {
        console.error("Erro ao sincronizar:", err);
        alert(`Erro ao sincronizar:\n\n${err.message}`);
        btn.disabled = false;
        btn.textContent = "🔄 Sincronizar";
      }
    });

    // 📄 Baixar PDF
    card.querySelector(".btn-pdf").addEventListener("click", async () => {
      try {
        const registros = await db.registros
          .where("data_turno")
          .equals(turno.data)
          .toArray();

        await gerarPDF(turno, turno.resumo || {}, registros);
      } catch (err) {
        console.error("Erro ao gerar PDF:", err);
        alert("Erro ao gerar PDF.");
      }
    });

    lista.appendChild(card);
  });
}

// ==============================================================
// 📡 Envio para API (mesma lógica do resumo.js)
// ==============================================================
async function enviarParaAPI(turno, registros) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado. Faça login novamente.");

  const payload = {
    turno: {
      data:                turno.data,
      municipio:           turno.municipio,
      ciclo:               turno.ciclo,
      localidade:          turno.localidade,
      categoriaLocalidade: turno.categoria_localidade ?? null,
      zona:                turno.zona                 ?? null,
      atividade:           turno.atividade            ?? null,
      agenteId:   parseInt(turno.agenteId, 10) || turno.agente,
      nomeAgente:          turno.nomeAgente || turno.agente,
    },
    registros: registros.map(r => ({
      quarteirao:          r.quarteirao          ?? null,
      sequencia:           r.sequencia           ?? null,
      sequencia2:          r.sequencia2          ?? null,
      lado:                r.lado                ?? null,
      tipoImovel:          r.tipo_imovel         ?? null,
      logradouro:          r.logradouro          ?? null,
      numero:              r.numero              ?? null,
      complemento:         r.complemento         ?? null,
      horarioEntrada:      r.horario_entrada      ?? null,
      informacao:          r.informacao          ?? null,
      a1:                  r.a1                  ?? null,
      a2:                  r.a2                  ?? null,
      b:                   r.b                   ?? null,
      c:                   r.c                   ?? null,
      d1:                  r.d1                  ?? null,
      d2:                  r.d2                  ?? null,
      e:                   r.e                   ?? null,
      inspL1:              r.insp_l1             ?? null,
      imTrat:              r.im_trat             ?? null,
      amostraInicial:      r.amostra_inicial     ?? null,
      amostraFinal:        r.amostra_final       ?? null,
      qtdDepTrat:          r.qtd_dep_trat        ?? null,
      depositosEliminados: r.depositos_eliminados ?? null,
      qtdTubitos:          r.qtd_tubitos         ?? null,
      quedaGramas:         r.queda_gramas        ?? null,
    })),
  };

  const response = await fetch(`${API_BASE_URL}/api/turnos/finalizar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.message || `Erro na API: ${response.status}`);
  }

  return await response.json();
}

// ==============================================================
// 📄 Geração de PDF (mesma lógica do resumo.js)
// ==============================================================
async function gerarPDF(turno, resumo, registros) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdf.setFontSize(14);
  pdf.text("SISAV - Relatório Diário de Campo", 14, 15);

  pdf.setFontSize(10);
  pdf.text(`Data: ${new Date(turno.data).toLocaleDateString("pt-BR")}`, 14, 25);
  pdf.text(`Município: ${turno.municipio || "Não informado"}`, 14, 32);
  pdf.text(`Localidade: ${turno.localidade || "Não informado"}`, 14, 39);
  pdf.text(`Agente: ${turno.nomeAgente || turno.agente}`, 14, 46);
  pdf.text("Resumo do Turno", 14, 52);

  pdf.autoTable({
    startY: 57,
    head: [["Indicador", "Quantidade"]],
    body: [
      ["Imóveis Inspecionados", resumo.inspecionados ?? 0],
      ["Focos Encontrados",     resumo.focos         ?? 0],
      ["Imóveis Fechados",      resumo.fechados      ?? 0],
      ["Tratamentos",           resumo.tratamentos   ?? 0],
      ["Imóveis Recuperados",   resumo.recuperados   ?? 0],
      ["Depósitos Eliminados",  resumo.depositos     ?? 0],
    ],
  });

  pdf.text(
    `Total de registros: ${registros.length}`,
    14,
    pdf.lastAutoTable.finalY + 10
  );

  pdf.save(`SISAV_${turno.data}_${turno.localidade}.pdf`);
}