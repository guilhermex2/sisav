// pendentes.js — substitui o bloco <script> inline do pendentes.html
// FIX 2: TIPOS_FECHADO expandido para incluir todos os sufixos -F e RECUSA
// FIX 4: Badge verde RECUPERADO nos imóveis já recuperados (ficam visíveis sem filtro)

// ── ESTADO GLOBAL ──────────────────────────────────────────────
let todosOsPendentes   = [];
let imovelSelecionado  = null;

// ── INDEXEDDB ──────────────────────────────────────────────────
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('antivetorialDB');
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function lerTodos(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── CHAVE DE ENDEREÇO ──────────────────────────────────────────
function chaveEndereco(r) {
  return [
    (r.logradouro  || '').trim().toLowerCase(),
    (r.numero      || '').trim().toLowerCase(),
    (r.complemento || '').trim().toLowerCase(),
  ].join('|');
}

// ── CALCULAR DIAS EM ABERTO ────────────────────────────────────
function diasEmAberto(data_turno) {
  if (!data_turno) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dt = new Date(data_turno + 'T00:00:00');
  return Math.floor((hoje - dt) / 86400000);
}

// ── LÓGICA PRINCIPAL ───────────────────────────────────────────
async function carregarPendentes() {
  const btn = document.getElementById('btn-atualizar');
  btn.classList.add('girando');
  mostrarEstado('carregando');

  try {
    const idb      = await abrirDB();

    // FIX 3: Lê também a store de recuperações
    const registros    = await lerTodos(idb, 'registros');
    let   recuperacoes = [];
    try { recuperacoes = await lerTodos(idb, 'recuperacao'); } catch (_) {}

    // FIX 2: Todos os tipos fechados + RECUSA
    const TIPOS_FECHADO = new Set(['R-F', 'C-F', 'TB-F', 'PE-F', 'O-F', 'RECUSA']);

    const fechados = registros.filter(r =>
      TIPOS_FECHADO.has((r.tipo_imovel || '').toUpperCase())
    );

    // Indexa recuperações por id de referência E por endereço
    const recupPorRef     = new Set(recuperacoes.map(r => r.recuperacao_ref).filter(Boolean));
    const recupPorEndereco = {};
    for (const rec of recuperacoes) {
      const chave = chaveEndereco(rec);
      if (!recupPorEndereco[chave]) recupPorEndereco[chave] = [];
      recupPorEndereco[chave].push(rec.data_turno || '');
    }

    const pendentes    = [];
    const recuperados  = []; // FIX 4: fechados que já foram recuperados

    for (const f of fechados) {
      const chave      = chaveEndereco(f);
      const dataFechado = f.data_turno || '';

      // Verifica recuperação: por ref de id OU por endereço+data posterior
      const foiRecuperadoPorRef      = f.id && recupPorRef.has(f.id);
      const datasRec                 = recupPorEndereco[chave] || [];
      const foiRecuperadoPorEndereco = datasRec.some(d => d > dataFechado);
      const foiRecuperado            = foiRecuperadoPorRef || foiRecuperadoPorEndereco || f.recuperado === true;

      if (foiRecuperado) {
        // FIX 4: Mantém na lista com status RECUPERADO
        recuperados.push({ ...f, dias: diasEmAberto(dataFechado), status: 'recuperado' });
      } else {
        pendentes.push({ ...f, dias: diasEmAberto(dataFechado), status: 'pendente' });
      }
    }

    // Ordena: pendentes mais antigos primeiro, recuperados mais recentes primeiro
    pendentes.sort((a, b)   => (a.data_turno || '') < (b.data_turno || '') ? -1 : 1);
    recuperados.sort((a, b) => (a.data_turno || '') > (b.data_turno || '') ? -1 : 1);

    // FIX 2 + FIX 4: pendentes SEM filtro já mostra tudo (pendentes + recuperados)
    todosOsPendentes = [...pendentes, ...recuperados];

    aplicarFiltros();

  } catch (err) {
    console.error('Erro ao carregar pendentes:', err);
    mostrarEstado('erro', 'Não foi possível acessar o banco de dados.<br>Verifique se o sistema está aberto corretamente.');
  } finally {
    btn.classList.remove('girando');
  }
}

// ── FILTROS ────────────────────────────────────────────────────
function aplicarFiltros() {
  const tipo   = document.getElementById('filtro-tipo').value;
  const busca  = document.getElementById('filtro-busca').value.toLowerCase().trim();
  const status = document.getElementById('filtro-status')?.value || '';

  let filtrados = todosOsPendentes;

  if (tipo)   filtrados = filtrados.filter(p => (p.tipo_imovel || '').toUpperCase() === tipo);
  if (busca)  filtrados = filtrados.filter(p =>
    (p.logradouro  || '').toLowerCase().includes(busca) ||
    (p.numero      || '').toLowerCase().includes(busca) ||
    (p.complemento || '').toLowerCase().includes(busca)
  );
  // FIX 4: filtro por status (pendente/recuperado)
  if (status === 'pendente')   filtrados = filtrados.filter(p => p.status === 'pendente');
  if (status === 'recuperado') filtrados = filtrados.filter(p => p.status === 'recuperado');

  renderizarPendentes(filtrados);
}

// ── RENDER ─────────────────────────────────────────────────────
function renderizarPendentes(pendentes) {
  const badge    = document.getElementById('badge-total');
  const conteudo = document.getElementById('conteudo');

  const qtdPendentes   = pendentes.filter(p => p.status === 'pendente').length;
  const qtdRecuperados = pendentes.filter(p => p.status === 'recuperado').length;

  if (pendentes.length === 0) {
    badge.style.display = 'none';
    mostrarEstado('vazio', 'Nenhum imóvel encontrado com os filtros aplicados.');
    return;
  }

  badge.textContent    = `${qtdPendentes} pendente${qtdPendentes !== 1 ? 's' : ''}`;
  badge.style.display  = 'inline-block';

  // Badge extra de recuperados
  let badgeRecupEl = document.getElementById('badge-recuperados');
  if (!badgeRecupEl) {
    badgeRecupEl = document.createElement('span');
    badgeRecupEl.id = 'badge-recuperados';
    badgeRecupEl.style.cssText = `
      background: #2E7D32; color: #fff;
      font-size: 12px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px;
      margin-left: 6px; letter-spacing: 0.3px;
    `;
    badge.insertAdjacentElement('afterend', badgeRecupEl);
  }
  badgeRecupEl.textContent   = qtdRecuperados > 0 ? `${qtdRecuperados} recuperado${qtdRecuperados !== 1 ? 's' : ''}` : '';
  badgeRecupEl.style.display = qtdRecuperados > 0 ? 'inline-block' : 'none';

  // Agrupar por agente
  const grupos = {};
  for (const p of pendentes) {
    const chave = p.agente || p.agenteId || '—';
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(p);
  }

  let html = '';
  for (const [nomeAgente, itens] of Object.entries(grupos)) {
    html += `
      <div class="grupo-agente">
        <div class="grupo-titulo">
          <span class="nome-agente">👤 ${nomeAgente}</span>
          <span class="badge-agente">${itens.length} imóvel${itens.length !== 1 ? 'is' : ''}</span>
        </div>
        <div class="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Data do Fechamento</th>
                <th>Logradouro</th>
                <th>Nº</th>
                <th>Compl.</th>
                <th>Quarteirão</th>
                <th>Tipo</th>
                <th>Dias em aberto</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map(p => linhaTabela(p)).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  conteudo.innerHTML = html;
}

function linhaTabela(p) {
  const tipoUpper   = (p.tipo_imovel || '').toUpperCase();
  const recuperado  = p.status === 'recuperado';

  // Classe de cor do tipo
  const tagClasse = tipoUpper.startsWith('R') ? 'tag-rf'
                  : tipoUpper.startsWith('C') ? 'tag-cf'
                  : tipoUpper === 'RECUSA'     ? 'tag-cf'
                  : 'tag-rf';

  let diasClasse = 'dias-ok';
  if (p.dias >= 7)      diasClasse = 'dias-urgente';
  else if (p.dias >= 3) diasClasse = 'dias-atencao';

  const dataFmt  = p.data_turno ? p.data_turno.split('-').reverse().join('/') : '—';
  const dadosJson = encodeURIComponent(JSON.stringify(p));

  // FIX 4: Badge verde RECUPERADO vs laranja PENDENTE
  const statusBadge = recuperado
    ? `<span style="
        display:inline-block;padding:3px 11px;border-radius:20px;
        font-size:11.5px;font-weight:700;
        background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;">
        ✅ RECUPERADO
      </span>`
    : `<span style="
        display:inline-block;padding:3px 11px;border-radius:20px;
        font-size:11.5px;font-weight:700;
        background:#FFF3E0;color:#E65100;border:1px solid #FFCC80;">
        ⏳ PENDENTE
      </span>`;

  // FIX 4: Botão desabilitado se já recuperado
  const btnRecuperar = recuperado
    ? `<button class="btn-recuperar" disabled
        style="opacity:0.45;cursor:not-allowed;background:#9e9e9e;">
        ✅ Recuperado
       </button>`
    : `<button class="btn-recuperar" onclick="abrirModal('${dadosJson}')">
        🔓 Recuperar
       </button>`;

  // Destaque visual da linha se recuperado
  const trStyle = recuperado ? 'style="background:#f0fdf4;"' : '';

  return `
    <tr ${trStyle}>
      <td>${dataFmt}</td>
      <td><strong>${p.logradouro || '—'}</strong></td>
      <td>${p.numero || '—'}</td>
      <td>${p.complemento || '—'}</td>
      <td>${p.quarteirao || '—'}</td>
      <td><span class="tag-tipo ${tagClasse}">${tipoUpper}</span></td>
      <td>
        <span class="dias-badge ${diasClasse}">
          ${p.dias === 0 ? 'Hoje' : p.dias === 1 ? '1 dia' : `${p.dias} dias`}
        </span>
      </td>
      <td>${statusBadge}</td>
      <td>${btnRecuperar}</td>
    </tr>`;
}

// ── ESTADOS DA TELA ────────────────────────────────────────────
function mostrarEstado(tipo, msg) {
  const badge    = document.getElementById('badge-total');
  const conteudo = document.getElementById('conteudo');

  if (tipo === 'carregando') {
    badge.style.display = 'none';
    conteudo.innerHTML  = `
      <div class="estado-tela">
        <div class="spinner"></div>
        <p>Carregando imóveis pendentes...</p>
      </div>`;
    return;
  }
  if (tipo === 'erro') {
    badge.style.display = 'none';
    conteudo.innerHTML  = `
      <div class="estado-tela">
        <div class="icone">⚠️</div>
        <p>${msg}</p>
      </div>`;
    return;
  }
  if (tipo === 'vazio') {
    conteudo.innerHTML = `
      <div class="estado-tela">
        <div class="icone">✅</div>
        <p>${msg || 'Nenhum imóvel pendente!'}</p>
      </div>`;
    return;
  }
}

// ── MODAL ──────────────────────────────────────────────────────
function abrirModal(dadosJson) {
  const p = JSON.parse(decodeURIComponent(dadosJson));
  imovelSelecionado = p;

  const dataFmt  = p.data_turno ? p.data_turno.split('-').reverse().join('/') : '—';
  const tipoNomes = {
    'R-F':    'Residencial Fechado',
    'C-F':    'Comercial Fechado',
    'TB-F':   'Terreno Baldio Fechado',
    'PE-F':   'Ponto Estratégico Fechado',
    'O-F':    'Outro Fechado',
    'RECUSA': 'Recusa do Morador',
  };
  const tipoNome = tipoNomes[(p.tipo_imovel || '').toUpperCase()] || p.tipo_imovel;

  document.getElementById('modal-info').innerHTML = `
    <strong>Logradouro:</strong> ${p.logradouro || '—'}<br>
    <strong>Número:</strong> ${p.numero || '—'}<br>
    <strong>Complemento:</strong> ${p.complemento || '—'}<br>
    <strong>Quarteirão:</strong> ${p.quarteirao || '—'}<br>
    <strong>Tipo original:</strong> ${tipoNome}<br>
    <strong>Data do fechamento:</strong> ${dataFmt}<br>
    <strong>Dias em aberto:</strong> ${p.dias === 0 ? 'Hoje' : p.dias === 1 ? '1 dia' : `${p.dias} dias`}
  `;

  document.getElementById('modal-overlay').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('aberto');
  imovelSelecionado = null;
}

function confirmarRecuperacao() {
  if (!imovelSelecionado) return;

  // Salva os dados no sessionStorage para o campo.js ler
  sessionStorage.setItem('recuperacao_imovel', JSON.stringify(imovelSelecionado));
  fecharModal();

  // Redireciona para o formulário de campo no modo recuperação
  window.location.href = 'campo.html?recuperacao=1';
}

// Fechar modal ao clicar fora
document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) fecharModal();
});

// Expõe funções usadas no HTML inline
window.carregarPendentes  = carregarPendentes;
window.aplicarFiltros     = aplicarFiltros;
window.abrirModal         = abrirModal;
window.fecharModal        = fecharModal;
window.confirmarRecuperacao = confirmarRecuperacao;

// ── INICIALIZAR ────────────────────────────────────────────────
carregarPendentes();