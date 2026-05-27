// pendentes.js


const API_URL = "https://sisav-api.onrender.com"

let todosOsPendentes  = []
let imovelSelecionado = null

function getHeaders() {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
  }
}

// ── CARREGAR ───────────────────────────────────────────────────
async function carregarPendentes() {
  const btn = document.getElementById("btn-atualizar")
  btn.classList.add("girando")
  mostrarEstado("carregando")

  try {
    const res = await fetch(`${API_URL}/imoveis-fechados`, {
      headers: getHeaders(),
    })

    if (!res.ok) throw new Error(`Erro ${res.status}`)

    const dados = await res.json()

    // Calcula dias em aberto no cliente (evita lógica de data no backend)
    todosOsPendentes = dados.map(item => ({
      ...item,
      dias:   diasEmAberto(item.dataFechamento),
      // Normaliza para o mesmo formato que o HTML já usa
      status: item.status.toLowerCase(), // "FECHADO"→"fechado", "PENDENTE"→"pendente", etc.
    }))

    aplicarFiltros()

  } catch (err) {
    console.error("Erro ao carregar pendentes:", err)
    mostrarEstado("erro", "Não foi possível carregar os dados. Verifique sua conexão.")
  } finally {
    btn.classList.remove("girando")
  }
}

// ── DIAS EM ABERTO ─────────────────────────────────────────────
function diasEmAberto(dataFechamento) {
  if (!dataFechamento) return 0
  const hoje    = new Date()
  hoje.setHours(0, 0, 0, 0)
  const fechado = new Date(dataFechamento)
  fechado.setHours(0, 0, 0, 0)
  return Math.floor((hoje - fechado) / 86400000)
}

// ── FILTROS ────────────────────────────────────────────────────
function aplicarFiltros() {
  const tipo   = document.getElementById("filtro-tipo").value
  const busca  = document.getElementById("filtro-busca").value.toLowerCase().trim()
  const status = document.getElementById("filtro-status")?.value || ""

  let filtrados = todosOsPendentes

  if (tipo) {
    filtrados = filtrados.filter(p =>
      (p.tipoImovel || "").toUpperCase() === tipo
    )
  }

  if (busca) {
    filtrados = filtrados.filter(p => {
      const logradouro  = (p.imovel?.logradouro  || "").toLowerCase()
      const numero      = (p.imovel?.numero       || "").toLowerCase()
      const complemento = (p.imovel?.complemento  || "").toLowerCase()
      return logradouro.includes(busca) || numero.includes(busca) || complemento.includes(busca)
    })
  }

  if (status === "pendente") {
    filtrados = filtrados.filter(p => p.status === "fechado" || p.status === "pendente")
  } else if (status === "recuperado") {
    filtrados = filtrados.filter(p => p.status === "recuperado")
  }

  renderizarPendentes(filtrados)
}

// ── RENDER ─────────────────────────────────────────────────────
function renderizarPendentes(pendentes) {
  const badge    = document.getElementById("badge-total")
  const conteudo = document.getElementById("conteudo")

  const qtdPendentes   = pendentes.filter(p => p.status === "fechado" || p.status === "pendente").length
  const qtdRecuperados = pendentes.filter(p => p.status === "recuperado").length

  if (pendentes.length === 0) {
    badge.style.display = "none"
    mostrarEstado("vazio", "Nenhum imóvel encontrado com os filtros aplicados.")
    return
  }

  badge.textContent   = `${qtdPendentes} pendente${qtdPendentes !== 1 ? "s" : ""}`
  badge.style.display = "inline-block"

  let badgeRecupEl = document.getElementById("badge-recuperados")
  if (!badgeRecupEl) {
    badgeRecupEl    = document.createElement("span")
    badgeRecupEl.id = "badge-recuperados"
    badgeRecupEl.style.cssText = `
      background: #2E7D32; color: #fff;
      font-size: 12px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px;
      margin-left: 6px; letter-spacing: 0.3px;
    `
    badge.insertAdjacentElement("afterend", badgeRecupEl)
  }
  badgeRecupEl.textContent   = qtdRecuperados > 0 ? `${qtdRecuperados} recuperado${qtdRecuperados !== 1 ? "s" : ""}` : ""
  badgeRecupEl.style.display = qtdRecuperados > 0 ? "inline-block" : "none"

  // Agrupa por agente
  const grupos = {}
  for (const p of pendentes) {
    const chave = p.agente?.nome || "—"
    if (!grupos[chave]) grupos[chave] = []
    grupos[chave].push(p)
  }

  let html = ""
  for (const [nomeAgente, itens] of Object.entries(grupos)) {
    html += `
      <div class="grupo-agente">
        <div class="grupo-titulo">
          <span class="nome-agente">👤 ${nomeAgente}</span>
          <span class="badge-agente">${itens.length} imóvel${itens.length !== 1 ? "is" : ""}</span>
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
                <th>Tentativas</th>
                <th>Dias em aberto</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map(p => linhaTabela(p)).join("")}
            </tbody>
          </table>
        </div>
      </div>`
  }

  conteudo.innerHTML = html
}

function linhaTabela(p) {
  const tipo       = (p.tipoImovel || "").toUpperCase()
  const recuperado = p.status === "recuperado"
  const recusado   = p.status === "recusado"

  const tagClasse = tipo.startsWith("R") ? "tag-rf"
                  : tipo.startsWith("C") ? "tag-cf"
                  : tipo === "RECUSA"    ? "tag-cf"
                  : "tag-rf"

  let diasClasse = "dias-ok"
  if (p.dias >= 7)      diasClasse = "dias-urgente"
  else if (p.dias >= 3) diasClasse = "dias-atencao"

  const dataFmt     = p.dataFechamento
    ? new Date(p.dataFechamento).toLocaleDateString("pt-BR")
    : "—"

  const tentativas  = p.tentativas?.length ?? 0
  const dadosJson   = encodeURIComponent(JSON.stringify(p))

  const statusBadge = recuperado
    ? `<span style="display:inline-block;padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;">✅ RECUPERADO</span>`
    : recusado
    ? `<span style="display:inline-block;padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700;background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2;">🚫 RECUSADO</span>`
    : p.status === "pendente"
    ? `<span style="display:inline-block;padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700;background:#FFF3E0;color:#E65100;border:1px solid #FFCC80;">⏳ PENDENTE</span>`
    : `<span style="display:inline-block;padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700;background:#FFF3E0;color:#E65100;border:1px solid #FFCC80;">⏳ FECHADO</span>`

  const btnRecuperar = (recuperado || recusado)
    ? `<button class="btn-recuperar" disabled style="opacity:0.45;cursor:not-allowed;background:#9e9e9e;">
        ${recuperado ? "✅ Recuperado" : "🚫 Recusado"}
       </button>`
    : `<button class="btn-recuperar" onclick="abrirModal('${dadosJson}')">
        🔓 Recuperar
       </button>`

  const trStyle = recuperado ? 'style="background:#f0fdf4;"'
                : recusado   ? 'style="background:#fff5f5;"'
                : ""

  return `
    <tr ${trStyle}>
      <td>${dataFmt}</td>
      <td><strong>${p.imovel?.logradouro || "—"}</strong></td>
      <td>${p.imovel?.numero      || "—"}</td>
      <td>${p.imovel?.complemento || "—"}</td>
      <td>${p.imovel?.quarteirao  || "—"}</td>
      <td><span class="tag-tipo ${tagClasse}">${tipo}</span></td>
      <td style="text-align:center">${tentativas}</td>
      <td>
        <span class="dias-badge ${diasClasse}">
          ${p.dias === 0 ? "Hoje" : p.dias === 1 ? "1 dia" : `${p.dias} dias`}
        </span>
      </td>
      <td>${statusBadge}</td>
      <td>${btnRecuperar}</td>
    </tr>`
}

// ── ESTADOS DA TELA ────────────────────────────────────────────
function mostrarEstado(tipo, msg) {
  const badge    = document.getElementById("badge-total")
  const conteudo = document.getElementById("conteudo")

  if (tipo === "carregando") {
    badge.style.display = "none"
    conteudo.innerHTML  = `
      <div class="estado-tela">
        <div class="spinner"></div>
        <p>Carregando imóveis pendentes...</p>
      </div>`
    return
  }
  if (tipo === "erro") {
    badge.style.display = "none"
    conteudo.innerHTML  = `
      <div class="estado-tela">
        <div class="icone">⚠️</div>
        <p>${msg}</p>
      </div>`
    return
  }
  if (tipo === "vazio") {
    conteudo.innerHTML = `
      <div class="estado-tela">
        <div class="icone">✅</div>
        <p>${msg || "Nenhum imóvel pendente!"}</p>
      </div>`
    return
  }
}

// ── MODAL ──────────────────────────────────────────────────────
function abrirModal(dadosJson) {
  const p = JSON.parse(decodeURIComponent(dadosJson))
  imovelSelecionado = p

  const dataFmt = p.dataFechamento
    ? new Date(p.dataFechamento).toLocaleDateString("pt-BR")
    : "—"

  const tipoNomes = {
    "R-F":    "Residencial Fechado",
    "C-F":    "Comercial Fechado",
    "TB-F":   "Terreno Baldio Fechado",
    "PE-F":   "Ponto Estratégico Fechado",
    "O-F":    "Outro Fechado",
    "RECUSA": "Recusa do Morador",
  }

  document.getElementById("modal-info").innerHTML = `
    <strong>Logradouro:</strong> ${p.imovel?.logradouro || "—"}<br>
    <strong>Número:</strong>     ${p.imovel?.numero      || "—"}<br>
    <strong>Complemento:</strong>${p.imovel?.complemento || "—"}<br>
    <strong>Quarteirão:</strong> ${p.imovel?.quarteirao  || "—"}<br>
    <strong>Tipo original:</strong> ${tipoNomes[p.tipoImovel] || p.tipoImovel}<br>
    <strong>Data do fechamento:</strong> ${dataFmt}<br>
    <strong>Tentativas anteriores:</strong> ${p.tentativas?.length ?? 0}<br>
    <strong>Dias em aberto:</strong> ${p.dias === 0 ? "Hoje" : p.dias === 1 ? "1 dia" : `${p.dias} dias`}
  `

  document.getElementById("modal-overlay").classList.add("aberto")
}

function fecharModal() {
  document.getElementById("modal-overlay").classList.remove("aberto")
  imovelSelecionado = null
}

function confirmarRecuperacao() {
  if (!imovelSelecionado) return

  // Passa o id do ImovelFechado para o campo.js via sessionStorage
  // O campo.js usa esse id para fazer o PATCH /imoveis-fechados/:id/recuperar
  sessionStorage.setItem("recuperacao_imovel", JSON.stringify({
    imovelFechadoId: imovelSelecionado.id,
    logradouro:      imovelSelecionado.imovel?.logradouro,
    numero:          imovelSelecionado.imovel?.numero,
    complemento:     imovelSelecionado.imovel?.complemento,
    quarteirao:      imovelSelecionado.imovel?.quarteirao,
  }))

  fecharModal()
  window.location.href = "campo.html?recuperacao=1"
}

document.getElementById("modal-overlay").addEventListener("click", function (e) {
  if (e.target === this) fecharModal()
})

window.carregarPendentes   = carregarPendentes
window.aplicarFiltros      = aplicarFiltros
window.abrirModal          = abrirModal
window.fecharModal         = fecharModal
window.confirmarRecuperacao = confirmarRecuperacao

carregarPendentes()