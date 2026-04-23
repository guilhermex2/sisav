import { db } from "../js/db.js";

const API_BASE_URL = "https://sisav-api.onrender.com";

// ==============================================================
// 📡 Função de envio para a API REST
// Agora apenas marca o turno como finalizado no banco.
// Turno e visitas já foram salvos pelo sync automático.
// ==============================================================
async function enviarParaAPI(turno) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Token de autenticação não encontrado. Faça login novamente.");
  }

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

// ==============================================================
// 🖥️ Inicialização da página
// ==============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const elData       = document.querySelector(".data");
  const elBairro     = document.querySelector(".bairro");
  const indicadores  = document.querySelectorAll(".indicator");
  const tbody        = document.querySelector("tbody");
  const btnFinalizar = document.querySelector(".btn-success");
  const badge        = document.querySelector(".badge");

  try {
    const dataTurnoAtivo = localStorage.getItem("turnoAtivo");

    if (!dataTurnoAtivo) {
      alert("Nenhum turno ativo encontrado.");
      window.location.href = "turno.html";
      return;
    }

    const [data, agenteId] = dataTurnoAtivo.split("_");
    const turno = await db.turnos.get({ data, agenteId });

    if (!turno || turno.finalizadoEm) {
      alert("Este turno já foi finalizado.");
      localStorage.removeItem("turnoAtivo");
      window.location.href = "turno.html";
      return;
    }

    elData.textContent   = new Date(turno.data).toLocaleDateString("pt-BR");
    elBairro.textContent = turno.localidade || "Não informado";

    const todosRegistros = await db.registros
      .where("data_turno")
      .equals(turno.data)
      .toArray();

    const registros    = todosRegistros.filter(r => !r.is_recuperacao);
    const recuperacoes = todosRegistros.filter(r =>  r.is_recuperacao);

    const resumo = {
      inspecionados: registros.length,
      focos:         0,
      fechados:      0,
      recuperados:   recuperacoes.length,
      tratamentos:   0,
      depositos:     0,
    };

    registros.forEach(r => {
      const situacao = String(r.tipo_imovel || "").toUpperCase();
      if (situacao === "R-F" || situacao === "C-F") {
        resumo.fechados += 1;
        return;
      }
      resumo.focos += (parseInt(r.a1)||0) + (parseInt(r.a2)||0) + (parseInt(r.b)||0)
                    + (parseInt(r.d1)||0) + (parseInt(r.d2)||0) + (parseInt(r.e)||0);
      resumo.fechados  += parseInt(r.c, 10) || 0;
      if (r.im_trat === true || String(r.im_trat).toUpperCase() === "X") resumo.tratamentos += 1;
      resumo.depositos += parseInt(r.depositos_eliminados, 10) || 0;
    });

    indicadores[0].textContent = resumo.inspecionados;
    indicadores[1].textContent = resumo.focos;
    indicadores[2].textContent = resumo.fechados;
    indicadores[3].textContent = resumo.tratamentos;

    tbody.innerHTML = `
      <tr>
        <td>${resumo.fechados}</td>
        <td>${resumo.inspecionados}</td>
        <td>${resumo.depositos}</td>
        <td>${resumo.tratamentos}</td>
        <td>${resumo.recuperados}</td>
      </tr>
    `;

    badge.textContent = "EM ANDAMENTO";
    badge.className   = "badge bg-warning text-dark px-3 py-2";

    // ==============================================================
    // 🔒 Finalizar turno
    // ==============================================================
    btnFinalizar.addEventListener("click", async () => {
      if (!confirm("Deseja finalizar este turno?")) return;

      btnFinalizar.disabled    = true;
      btnFinalizar.textContent = "Finalizando...";

      try {
        // 1️⃣ Marca como finalizado no IndexedDB
        const finalizadoEm = new Date().toISOString();
        await db.turnos.update(
          { data: turno.data, agenteId: turno.agenteId },
          { finalizadoEm, resumo }
        );
        turno.finalizadoEm = finalizadoEm;

        // 2️⃣ Apenas avisa o servidor para marcar finalizadoEm no banco
        // Turno e visitas já foram sincronizados automaticamente durante o dia
        try {
          await enviarParaAPI(turno);
          console.log("✅ Turno finalizado na API com sucesso.");
        } catch (erroAPI) {
          console.error("⚠️ Erro ao finalizar na API:", erroAPI);
          alert(
            `Turno finalizado localmente, mas houve um erro ao sincronizar:\n\n${erroAPI.message}\n\nOs dados estão salvos no dispositivo.`
          );
        }

        // 3️⃣ Gera o PDF (apenas registros normais no relatório)
        await gerarPDF(turno, resumo, registros);

        // 4️⃣ Limpa turno ativo
        localStorage.removeItem("turnoAtivo");

        badge.textContent = "FINALIZADO";
        badge.className   = "badge bg-success px-3 py-2";

        alert("Turno finalizado com sucesso!");
        window.location.href = "turno.html";

      } catch (err) {
        console.error("Erro ao finalizar turno:", err);
        alert("Erro ao finalizar turno. Tente novamente.");
        btnFinalizar.disabled    = false;
        btnFinalizar.textContent = "Finalizar";
      }
    });

  } catch (err) {
    console.error("Erro no resumo:", err);
    alert("Erro ao carregar resumo.");
  }
});

// ==============================================================
// 📄 Geração de PDF
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
      ["Imóveis Inspecionados", resumo.inspecionados],
      ["Focos Encontrados",     resumo.focos],
      ["Imóveis Fechados",      resumo.fechados],
      ["Tratamentos",           resumo.tratamentos],
      ["Imóveis Recuperados",   resumo.recuperados],
      ["Depósitos Eliminados",  resumo.depositos],
    ],
  });

  pdf.text(
    `Total de registros: ${registros.length}`,
    14,
    pdf.lastAutoTable.finalY + 10
  );

  pdf.save(`SISAV_${turno.data}_${turno.localidade}.pdf`);
}