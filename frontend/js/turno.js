// turno.js
import { db } from "./db.js";

document.addEventListener("DOMContentLoaded", async () => {
  const hoje = new Date().toISOString().split("T")[0];
  const turnoHoje = await db.turnos.get(hoje);

  if (turnoHoje && turnoHoje.status !== "finalizado") {
    window.location.href = "turno.html";
  }

  const form = document.getElementById("form-turno");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = form.data.value;

    // Verifica se já existe turno salvo nessa data
    const turnoExiste = await db.turnos.get(data);
    if (turnoExiste) {
      alert("Já existe turno salvo nesta data!");
      return;
    }

    const turno = {
      data: form.data.value,
      municipio: form.municipio.value,
      ciclo: form.ciclo.value,
      localidade: form.localidade.value,
      categoria_localidade: form.categoria_localidade.value,
      zona: form.zona.value,
      atividade: form.atividade.value,
      agente: form.agente.value,
    };

    await db.turnos.put(turno);

    alert("Turno salvo com sucesso!");

    // Redireciona para a página de registros
    window.location.href = "ficha-registro.html";
  });
});
