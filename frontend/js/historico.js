import { db } from "./db.js";

const LIMITE_DIAS = 1; //  ajuste aqui (ex: 30, 60, 90)

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await limparHistoricoAntigo();
    await carregarHistorico();
  } catch (error) {
    console.error("Erro no carregamento do histórico:", error);
  }
});

//  Limpa turnos antigos + registros associados
async function limparHistoricoAntigo() {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - LIMITE_DIAS);

  const turnosAntigos = await db.turnos
    .where("finalizadoEm")
    .below(dataLimite.toISOString())
    .toArray();

  for (const turno of turnosAntigos) {
    await db.registros
      .where("data_turno")
      .equals(turno.data)
      .delete();

    await db.turnos.delete(turno.data);
  }
}

//  Carrega histórico
async function carregarHistorico() {
  const lista = document.getElementById("listaTurnos");
  const semDados = document.getElementById("semDados");

  const turnos = await db.turnos
    .where("finalizadoEm")
    .above("")
    .reverse()
    .toArray();

  if (!turnos.length) {
    semDados.classList.remove("d-none");
    return;
  }

  turnos.forEach(turno => {
    const card = document.createElement("div");
    card.className = "card shadow-sm";

    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">
          📅 ${new Date(turno.data).toLocaleDateString("pt-BR")}
        </h5>
        <p class="card-text mb-1">📍 ${turno.localidade || "Não informado"}</p>
        <p class="card-text mb-1">👤 ${turno.agente || "Não informado"}</p>
        <p class="card-text text-muted">
          ⏱ Finalizado em: ${new Date(turno.finalizadoEm).toLocaleString("pt-BR")}
        </p>

        <button class="btn btn-outline-primary btn-sm">
          Ver detalhes
        </button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => {
      localStorage.setItem("turnoHistorico", turno.data);
      window.location.href = "detalhe-turno.html";
    });

    lista.appendChild(card);
  });
}
