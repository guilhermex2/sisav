// registros-new.js
import { db } from "../js/db.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📌 registros-new.js carregado");

  try {
    // 1) Busca o último turno salvo (independente da data do sistema)
    const ultimoTurno = await db.turnos.orderBy("data").last();
    console.log("🔎 ultimoTurno (orderBy('data').last()):", ultimoTurno);

    if (!ultimoTurno) {
      console.warn("⚠️ Nenhum turno encontrado no banco (ultimoTurno === null|undefined).");
      alert("Você precisa cadastrar um turno para registrar os imóveis.");
      window.location.href = "turno.html"; // ou "index.html" conforme sua navegação
      return;
    }

    // 2) Carrega só registros vinculados ao turno encontrado
    const dataTurno = ultimoTurno.data;
    console.log("✅ Usando turno com data:", dataTurno);

    // busca registros filtrando pelo campo data_turno (assumindo que esse campo existe nos registros)
    const registrosDoTurno = await db.registros.where("data_turno").equals(dataTurno).toArray();
    console.log(`📦 registrosDoTurno (total ${registrosDoTurno.length}):`, registrosDoTurno);

    // 3) Preenche a tabela
    const tabela = document.querySelector("#tabela-registros tbody");
    tabela.innerHTML = ""; // limpa linhas fixas

    if (!registrosDoTurno || registrosDoTurno.length === 0) {
      tabela.innerHTML = `
        <tr>
          <td colspan="25" style="text-align:center; color:#555;">
            Nenhum registro encontrado para o turno de ${dataTurno}.
          </td>
        </tr>
      `;
      return;
    }

    registrosDoTurno.forEach(reg => {
      const tr = document.createElement("tr");
      tr.dataset.id = reg.id;

      tr.innerHTML = `
        <td>${reg.data || dataTurno || "-"}</td>
        <td class="editavel" data-campo="quarteirao">${reg.quarteirao || "-"}</td>
        <td class="editavel" data-campo="lado">${reg.lado || "-"}</td>
        <td class="editavel" data-campo="logradouro">${reg.logradouro || "-"}</td>
        <td class="editavel" data-campo="numero">${reg.numero || "-"}</td>
        <td class="editavel" data-campo="sequencia">${reg.sequencia || "-"}</td>
        <td class="editavel" data-campo="complemento">${reg.complemento || "-"}</td>
        <td class="editavel" data-campo="tipo_imovel">${reg.tipo_imovel || reg.tipoImovel || "-"}</td>
        <td data-campo="horario_entrada">${reg.horario_entrada || reg.horarioEntrada || "-"}</td>

        <td class="editavel" data-campo="a1">${(reg.a1 || reg.A1)}</td>
        <td class="editavel" data-campo="a2">${(reg.a2 || reg.A2)}</td>
        <td class="editavel" data-campo="b">${(reg.b  || reg.B) }</td>
        <td class="editavel" data-campo="c">${(reg.c  || reg.C) }</td>
        <td class="editavel" data-campo="d1">${(reg.d1 || reg.D1)}</td>
        <td class="editavel" data-campo="d2">${(reg.d2 || reg.D2)}</td>
        <td class="editavel" data-campo="e">${(reg.e  || reg.E) }</td>

        <td class="editavel" data-campo="depositos_eliminados">${reg.depositos_eliminados || reg.eliminado || "-"}</td>
        <td class="editavel" data-campo="insp_l1">${reg.insp_l1 || reg.imoveisL1 || "-"}</td>
        <td class="editavel" data-campo="amostra_inicial">${reg.amostra_inicial || reg.amostraInicial || "-"}</td>
        <td class="editavel" data-campo="amostra_final">${reg.amostra_final || reg.amostraFinal || "-"}</td>
        <td class="editavel" data-campo="qtd_tubitos">${reg.qtd_tubitos || reg.tubitos || "-"}</td>
        <td class="editavel" data-campo="im_trat">${reg.im_trat || reg.tratados || "-"}</td>
        <td class="editavel" data-campo="queda_gramas">${reg.queda_gramas || reg.queda || "-"}</td>
        <td class="editavel" data-campo="qtd_dep_trat">${reg.qtd_dep_trat || reg.depTratados || "-"}</td>

        <td class="editavel" data-campo="informacao">${reg.informacao || reg.informações || "-"}</td>
        <td>
          <button class="btn btn-sm btn-warning btn-editar">Editar</button>
          <button class="btn btn-sm btn-success btn-salvar d-none">Salvar</button>
        </td>
      `;

      tabela.appendChild(tr);
    });

  } catch (err) {
    console.error("Erro geral em registros-new.js:", err);
    alert("Erro ao carregar registros. Veja o console para detalhes.");
  }
});



//Função para editar registro
function editarLinha(botao) {
  const linha = botao.closest("tr");
  const tds = linha.querySelectorAll(".editavel");

  tds.forEach(td => {
    const valor = td.innerText;
    td.dataset.valorOriginal = valor;
    td.innerHTML = `<input class="form-control form-control-sm" value="${valor}">`;
  });

  botao.classList.add("d-none");
  botao.nextElementSibling.classList.remove("d-none");
}

async function salvarLinha(botao) {
  const linha = botao.closest("tr");
  const id = Number(linha.dataset.id);
  const tds = linha.querySelectorAll(".editavel");

  // Busca o registro original
  const registro = await db.registros.get(id);

  // Atualiza apenas os campos editados
  tds.forEach(td => {
    const input = td.querySelector("input");
    const campo = td.dataset.campo;
    registro[campo] = input.value;
  });

  await db.registros.put(registro);

  location.reload(); // simples e seguro por enquanto
}
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-editar")) {
    editarLinha(e.target);
  }

  if (e.target.classList.contains("btn-salvar")) {
    await salvarLinha(e.target);
  }
});
