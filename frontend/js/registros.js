// registros.js
import { db } from "./db.js";

document.addEventListener("DOMContentLoaded", async () => {

  const dataTurnoAtivo = localStorage.getItem("turnoAtivo");

  if (!dataTurnoAtivo) {
    alert("Não há turno ativo para registrar imóveis.");
    window.location.href = "turno.html";
    return;
  }

  const turnoAtivo = await db.turnos.get(dataTurnoAtivo);

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
      data_turno: turnoAtivo.data, // 🔑 vínculo lógico
      criado_em: new Date().toISOString()
    });

    alert("Registro salvo com sucesso!");
    form.reset();
  });
});
