// ../js/tabela-recuperacao.js
import { db } from "./db.js";

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.querySelector("#tabela-registros tbody");
  tbody.innerHTML = "";

  try {
    const recuperacoes = await db.recuperacao.toArray();


    if (recuperacoes.length === 0) {
        console.log(recuperacoes)
      tbody.innerHTML = `
        <tr>
          <td colspan="11">Nenhum registro de recuperação encontrado.</td>
        </tr>
      `;
      return;
    }

    recuperacoes.forEach(reg => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${reg.data || "-"}</td>
        <td>${reg.setor || "-"}</td>
        <td>${reg.lado || "-"}</td>
        <td>${reg.logradouro || "-"}</td>
        <td>${reg.tipoImovel || "-"}</td>
        <td>${reg.tratamento || "-"}</td>
        <td>${reg.larvicida || "-"}</td>
        <td>${reg.germinal || "-"}</td>
        <td>${reg.depTratados ?? 0}</td>
        <td>${reg.depEliminados ?? 0}</td>
        <td>${reg.observacao || "-"}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Erro ao carregar registros de recuperação:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="11">Erro ao carregar os dados.</td>
      </tr>
    `;
  }
});
