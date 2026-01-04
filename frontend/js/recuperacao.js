// recuperacao.js
import { db } from "../js/db.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("recuperacaoForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = Object.fromEntries(new FormData(form));

    // Adiciona a data do registro
    dados.criado_em = new Date().toISOString();

    try {
      await db.recuperacao.add(dados);

      alert("Recuperação salva com sucesso!");
      form.reset();

    } catch (err) {
      console.error("Erro ao salvar recuperação:", err);
      alert("Erro ao salvar recuperação. Veja o console.");
    }
  });
});
