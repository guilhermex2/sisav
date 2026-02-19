// turno.js
import { db } from "./db.js";

document.addEventListener("DOMContentLoaded", async () => {
  const hoje = new Date().toISOString().split("T")[0];
  const turnoHoje = await db.turnos.get(hoje);
  
  //Está recarregando a pagina infinitamente, procurar correção
  /*
  if (turnoHoje && turnoHoje.status !== "finalizado") {
    localStorage.setItem("turnoAtivo", turnoHoje.data);
    window.location.href = "turno.html";
  }
  */

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

    // salva turno ativo
    localStorage.setItem("turnoAtivo", turno.data);

    alert("Turno salvo com sucesso!");

    try {
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
      const token = localStorage.getItem("token")
      
      const response = await fetch("http://localhost:4000/sync/turno", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        body: JSON.stringify(turno)
      })

      if (!response.ok) {
        throw new Error("Login inválido");
      }

      const data = await response.json()
    } catch (error) {
      alert("Erro ao enviar turno ao DB")
    } 
    // Redireciona para a página de registros
    window.location.href = "ficha-registro.html";
  });
});
