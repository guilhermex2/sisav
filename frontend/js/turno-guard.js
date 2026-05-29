// turno-guard.js
import { db } from "./db.js";

document.addEventListener("DOMContentLoaded", async () => {
  const turnoAtivo = await db.turnos
    .orderBy("data")
    .reverse()
    .filter(t => !t.finalizadoEm)
    .first();

  if (!turnoAtivo) {
    Swal.fire({
      title: "Nenhum turno ativo",
      text: "Não há turno ativo para registrar imóveis.\nFaça login e inicie um turno para acessar esta página.",
      icon: "warning"
    }).then(() => {
      window.location.href = "turno.html";
    });
  }
});
