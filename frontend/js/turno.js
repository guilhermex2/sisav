// turno.js
import { db } from "./db.js";

document.addEventListener("DOMContentLoaded", async () => {
  const hoje = new Date().toISOString().split("T")[0];
  const agenteId = localStorage.getItem("agenteId");

  // busca com chave composta
  const turnoHoje = await db.turnos.get({ data: hoje, agenteId });

  const form = document.getElementById("form-turno");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = form.data.value;
    const agenteId = localStorage.getItem("agenteId") || form.agente.value;
    const nomeAgente = form.agente.value;

    //  agenteId declarado antes da validação
    const turnoExiste = await db.turnos.get({ data, agenteId });
    if (turnoExiste) {
      alert("Já existe turno salvo nesta data!");
      return;
    }

    const turno = {
      data:                 form.data.value,
      municipio:            form.municipio.value,
      ciclo:                form.ciclo.value,
      localidade:           form.localidade.value,
      categoria_localidade: form.categoria_localidade.value,
      zona:                 form.zona.value,
      atividade:            form.atividade.value,
      agente:               nomeAgente,
      nomeAgente:           nomeAgente,
      agenteId:             agenteId,
    };

    await db.turnos.put(turno);

    //  turnoAtivo inclui agenteId para não conflitar entre agentes
    localStorage.setItem("turnoAtivo", `${turno.data}_${agenteId}`);

    alert("Turno salvo com sucesso!");

    window.location.href = "ficha-registro.html";
  });
});