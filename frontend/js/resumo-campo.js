import { db } from "../js/db.js";

document.addEventListener("DOMContentLoaded", async () => {
  const elData = document.querySelector(".data");
  const elBairro = document.querySelector(".bairro");
  const indicadores = document.querySelectorAll(".indicator");
  const tbody = document.querySelector("tbody");
  const btnFinalizar = document.querySelector(".btn-success");
  const badge = document.querySelector(".badge");

  try {
    // 🔑 Buscar turno ativo explícito
    const dataTurnoAtivo = localStorage.getItem("turnoAtivo");

    if (!dataTurnoAtivo) {
      alert("Nenhum turno ativo encontrado.");
      window.location.href = "turno.html";
      return;
    }

    const turno = await db.turnos.get(dataTurnoAtivo);

    if (!turno || turno.finalizadoEm) {
      alert("Este turno já foi finalizado.");
      localStorage.removeItem("turnoAtivo");
      window.location.href = "turno.html";
      return;
    }

    // 🔹 Dados do turno
    elData.textContent = new Date(turno.data).toLocaleDateString("pt-BR");
    elBairro.textContent = turno.localidade || "Não informado";

    // 🔹 Buscar registros do turno
    const registros = await db.registros
      .where("data_turno")
      .equals(turno.data)
      .toArray();

    // 🔹 Resumo
    const resumo = {
      inspecionados: registros.length,
      focos: 0,
      fechados: 0,
      tratamentos: 0,
      depositos: 0
    };

    registros.forEach(r => {
      const a1 = parseInt(r.a1, 10) || 0;
      const a2 = parseInt(r.a2, 10) || 0;
      const b  = parseInt(r.b, 10)  || 0;
      const c  = parseInt(r.c, 10)  || 0;
      const d1 = parseInt(r.d1, 10) || 0;
      const d2 = parseInt(r.d2, 10) || 0;
      const e  = parseInt(r.e, 10)  || 0;

      resumo.fechados += c;
      resumo.focos += (a1 + a2 + b + d1 + d2 + e);

      if (String(r.im_trat).toUpperCase() === "X") {
        resumo.tratamentos += 1;
      }

      resumo.depositos += parseInt(r.depositos_eliminados, 10) || 0;
    });

    // 🔹 UI
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
      </tr>
    `;

    badge.textContent = "EM ANDAMENTO";
    badge.className = "badge bg-warning text-dark px-3 py-2";

    // 🔒 Finalizar turno
    btnFinalizar.addEventListener("click", async () => {
      if (!confirm("Deseja finalizar este turno?")) return;

      await db.turnos.update(turno.data, {
        finalizadoEm: new Date().toISOString(),
        resumo
      });

      localStorage.removeItem("turnoAtivo");

      badge.textContent = "FINALIZADO";
      badge.className = "badge bg-success px-3 py-2";
      btnFinalizar.disabled = true;

      alert("Turno finalizado com sucesso!");
      window.location.href = "turno.html";
    });

  } catch (err) {
    console.error("Erro no resumo:", err);
    alert("Erro ao carregar resumo.");
  }
});
