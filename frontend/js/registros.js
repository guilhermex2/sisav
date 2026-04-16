// registros.js
/*
Script para salvar os Imoveis durante o dia no campo
Todos os registros são salvos no indexdDb
*/
import { db } from "./db.js";

document.addEventListener("DOMContentLoaded", async () => {

  const turnoAtivoKey = localStorage.getItem("turnoAtivo");
  const agenteId = localStorage.getItem("agenteId");

  if (!turnoAtivoKey) {
    alert("Não há turno ativo para registrar imóveis.");
    window.location.href = "turno.html";
    return;
  }

  // Extrai a data da chave "2025-01-10_agenteId123"
  const data = turnoAtivoKey.split("_")[0];

  // Busca com chave composta
  const turnoAtivo = await db.turnos.get({ data, agenteId });

  if (!turnoAtivo || turnoAtivo.finalizadoEm) {
    alert("Este turno já foi finalizado.");
    localStorage.removeItem("turnoAtivo");
    window.location.href = "turno.html";
    return;
  }

  const form = document.getElementById("registroForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = Object.fromEntries(new FormData(form));

    await db.registros.add({
      ...dados,
      data_turno: turnoAtivo.data,
      criado_em: new Date().toISOString()
    });

    alert("Registro salvo com sucesso!");
    form.reset();
  });
});