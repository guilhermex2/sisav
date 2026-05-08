// registros-new.js
// FIX 3 + FIX 5:
//   - Lê tanto db.registros quanto db.recuperacao para mostrar tudo na tabela
//   - Imóveis fechados permanecem na tabela com badge "FECHADO"
//   - Recuperações aparecem como linha separada com badge "RECUPERADO"

import { db } from "./db.js";

const TIPOS_FECHADO = new Set(['R-F', 'C-F', 'TB-F', 'PE-F', 'O-F']);

document.addEventListener("DOMContentLoaded", async () => {
  await carregarTabela();
});

async function carregarTabela() {
  const tbody = document.querySelector("#tabela-registros tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="26" style="text-align:center;padding:24px;color:#718096;">Carregando...</td></tr>`;

  try {
    // FIX 3: Lê as duas stores
    const [registros, recuperacoes] = await Promise.all([
      db.registros.toArray(),
      db.recuperacao.toArray(),
    ]);

    // Indexa recuperações por referência (id do fechado) ou por endereço+data
    const mapaRecuperacoes = {};
    for (const rec of recuperacoes) {
      if (rec.recuperacao_ref) {
        mapaRecuperacoes[rec.recuperacao_ref] = rec;
      }
    }

    // Ordena registros: mais recentes primeiro
    registros.sort((a, b) => (b.criado_em || '') > (a.criado_em || '') ? 1 : -1);

    if (registros.length === 0 && recuperacoes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="26" style="text-align:center;padding:32px;color:#718096;">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    let html = '';

    // ── Linha para cada registro normal
    for (const r of registros) {
      const tipoUp   = (r.tipo_imovel || '').toUpperCase();
      const fechado  = TIPOS_FECHADO.has(tipoUp);
      const recusa   = tipoUp === 'RECUSA';
      const recup    = mapaRecuperacoes[r.id]; // registro de recuperação vinculado

      const rowClass = fechado   ? 'row-fechado'
                     : recusa    ? 'row-recusa'
                     : recup     ? 'row-recuperado'
                     : '';

      html += linhaRegistro(r, rowClass, recup ? 'recuperado' : fechado ? 'fechado' : recusa ? 'recusa' : 'normal');

      // FIX 4 + FIX 5: Se existe recuperação vinculada, exibe logo abaixo como linha de recuperação
      if (recup) {
        html += linhaRegistro(recup, 'row-recuperacao', 'recuperacao');
      }
    }

    // Recuperações sem ref (registros antigos sem recuperacao_ref)
    const semRef = recuperacoes.filter(r => !r.recuperacao_ref);
    for (const r of semRef) {
      html += linhaRegistro(r, 'row-recuperacao', 'recuperacao');
    }

    tbody.innerHTML = html || `<tr><td colspan="26" style="text-align:center;padding:32px;color:#718096;">Nenhum registro encontrado.</td></tr>`;

  } catch (err) {
    console.error('[registros-new] Erro ao carregar:', err);
    tbody.innerHTML = `<tr><td colspan="26" style="text-align:center;padding:24px;color:#dc3545;">Erro ao carregar registros. Tente recarregar a página.</td></tr>`;
  }
}

function badgeTipo(r, situacao) {
  const tipoUp = (r.tipo_imovel || '—').toUpperCase();

  if (situacao === 'recuperacao') {
    // FIX 4: Badge verde RECUPERADO
    return `<span class="badge-tipo badge-recup">✅ RECUPERADO</span>`;
  }
  if (situacao === 'recusa') {
    return `<span class="badge-tipo badge-recusa">🚫 RECUSA</span>`;
  }
  if (situacao === 'fechado' || situacao === 'recuperado') {
    // FIX 5: Fechado permanece na tabela com badge laranja
    const label = situacao === 'recuperado'
      ? `🔓 ${tipoUp} <small style="font-weight:400">(recup.)</small>`
      : `🔒 ${tipoUp}`;
    return `<span class="badge-tipo badge-fechado">${label}</span>`;
  }

  // Normal
  const base = tipoUp.replace('-F','');
  const cls  = { R:'badge-R', C:'badge-C', TB:'badge-TB', PE:'badge-PE', O:'badge-O' }[base] || 'badge-O';
  return `<span class="badge-tipo ${cls}">${tipoUp}</span>`;
}

function linhaRegistro(r, rowClass, situacao) {
  const dataFmt = r.data_turno ? r.data_turno.split('-').reverse().join('/') : '—';

  const isRecuperacao = situacao === 'recuperacao';
  const prefixo = isRecuperacao
    ? `<td colspan="9" style="background:#f0fdf4;color:#065f46;font-size:0.78rem;padding:6px 14px;">
         &nbsp;&nbsp;&nbsp;↳ <strong>Recuperação</strong> em ${dataFmt} — ${r.logradouro || ''} ${r.numero || ''}
       </td>`
    : `
      <td>${dataFmt}</td>
      <td>${r.quarteirao || '—'}</td>
      <td>${r.lado || '—'}</td>
      <td style="text-align:left">${r.logradouro || '—'}</td>
      <td>${r.numero || '—'}</td>
      <td>${r.sequencia2 || r.sequencia || '—'}</td>
      <td>${r.complemento || '—'}</td>
      <td>${badgeTipo(r, situacao)}</td>
      <td>${r.horario_entrada || '—'}</td>
    `;

  if (isRecuperacao) {
    // Linha compacta de recuperação: mostra só dados de vistoria
    return `
      <tr class="${rowClass}" style="font-size:0.8rem;">
        ${prefixo}
        <td class="col-sep">${r.a1 || 0}</td>
        <td>${r.a2 || 0}</td>
        <td>${r.b  || 0}</td>
        <td>${r.c  || 0}</td>
        <td>${r.d1 || 0}</td>
        <td>${r.d2 || 0}</td>
        <td>${r.e  || 0}</td>
        <td class="col-sep">${r.depositos_eliminados || 0}</td>
        <td>${r.insp_l1 || 'N'}</td>
        <td>${r.amostra_inicial || 0}</td>
        <td>${r.amostra_final   || 0}</td>
        <td>${r.qtd_tubitos     || 0}</td>
        <td class="col-sep">${r.im_trat || 'N'}</td>
        <td>${r.queda_gramas    || 0}</td>
        <td>${r.qtd_dep_trat    || 0}</td>
        <td class="col-sep" style="text-align:left;font-size:0.75rem;">${r.informacao || '—'}</td>
        <td>—</td>
      </tr>`;
  }

  return `
    <tr class="${rowClass}">
      ${prefixo}
      <td class="col-sep">${r.a1 || 0}</td>
      <td>${r.a2 || 0}</td>
      <td>${r.b  || 0}</td>
      <td>${r.c  || 0}</td>
      <td>${r.d1 || 0}</td>
      <td>${r.d2 || 0}</td>
      <td>${r.e  || 0}</td>
      <td class="col-sep">${r.depositos_eliminados || 0}</td>
      <td>${r.insp_l1 || 'N'}</td>
      <td>${r.amostra_inicial || 0}</td>
      <td>${r.amostra_final   || 0}</td>
      <td>${r.qtd_tubitos     || 0}</td>
      <td class="col-sep">${r.im_trat || 'N'}</td>
      <td>${r.queda_gramas    || 0}</td>
      <td>${r.qtd_dep_trat    || 0}</td>
      <td class="col-sep" style="text-align:left;font-size:0.75rem;">${r.informacao || '—'}</td>
      <td>
        <button onclick="excluirRegistro(${r.id})"
          style="background:none;border:1px solid #fca5a5;color:#dc2626;border-radius:5px;padding:3px 10px;font-size:0.75rem;cursor:pointer;">
          🗑 Excluir
        </button>
      </td>
    </tr>`;
}

// Expõe globalmente para o onclick inline
window.excluirRegistro = async function(id) {
  if (!confirm("Deseja excluir este registro?")) return;
  await db.registros.delete(id);
  await carregarTabela();
};