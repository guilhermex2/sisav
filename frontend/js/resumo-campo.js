import { db } from "../js/db.js";

// ⚙️ Configure aqui quando sua API estiver pronta
const API_BASE_URL = "https://sisav-api.onrender.com";

// ==============================================================
// 📡 Função de envio para a API REST
// ==============================================================
async function enviarParaAPI(turno, registros) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Token de autenticação não encontrado. Faça login novamente.");
  }

  const payload = {
    turno: {
      data:                turno.data,
      municipio:           turno.municipio,
      ciclo:               turno.ciclo,
      localidade:          turno.localidade,
      categoriaLocalidade: turno.categoria_localidade ?? null,
      zona:                turno.zona                 ?? null,
      atividade:           turno.atividade            ?? null,
      agenteId:   parseInt(turno.agenteId, 10)  || turno.agente,
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
      isRecuperacao:       r.is_recuperacao      ?? false, // ✅ informa a API se é recuperação
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

    // ✅ Busca todos os registros do dia
    const todosRegistros = await db.registros
      .where("data_turno")
      .equals(turno.data)
      .toArray();

    // ✅ Separa registros normais de recuperações
    // Recuperações têm is_recuperacao: true e NÃO entram na soma do dia
    const registros    = todosRegistros.filter(r => !r.is_recuperacao);
    const recuperacoes = todosRegistros.filter(r =>  r.is_recuperacao);

    // 🔹 Calcular resumo apenas com registros normais
    const resumo = {
      inspecionados: registros.length,    // ✅ sem recuperações
      focos:         0,
      fechados:      0,
      recuperados:   recuperacoes.length, // ✅ recuperações do dia via campo.js
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
        await db.turnos.update({ data: turno.data, agenteId: turno.agenteId }, { finalizadoEm, resumo });
        turno.finalizadoEm = finalizadoEm;

        // 2️⃣ Envia para a API (todos os registros, inclusive recuperações com a flag)
        try {
          await enviarParaAPI(turno, todosRegistros);

          // ✅ Marca como sincronizado no IndexedDB
          const sincronizadoEm = new Date().toISOString();
          await db.turnos.update(
            { data: turno.data, agenteId: turno.agenteId },
            { sincronizadoEm }
          );

          console.log("✅ Dados enviados para a API com sucesso.");
        } catch (erroAPI) {
          console.error("⚠️ Erro ao enviar para API:", erroAPI);
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