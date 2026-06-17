// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
let allFieldData = [];   // todos os registros brutos (enriquecidos pelo getCampo)
let homeFiltered = [];
let homePage     = 1;
const homePerPage = 6;

let dailyData     = [];
let dailyFiltered = [];
let dailyPage     = 1;
const dailyPerPage = 7;

let editingIndex = null; // índice em allFieldData do registro sendo editado

// ─── NORMALIZA O CAMPO "entrada" ───────────────────────────────────────────────
// A API pode retornar diferentes formatos: "S"/"N", "s"/"n", 1/0, true/false,
// "ABERTO"/"FECHADO", "SIM"/"NAO", etc.
// Esta função sempre devolve "S" (conseguiu entrar) ou "N" (imóvel fechado).
function normalizarEntrada(val) {
  if (val === null || val === undefined || val === "") return null; // sem dado
  const v = String(val).trim().toUpperCase();
  // Valores que indicam "com entrada / inspecionado"
  if (["S", "SIM", "1", "TRUE", "ABERTO", "INSPECIONADO", "OPEN"].includes(v)) return "S";
  // Valores que indicam "fechado / sem entrada"
  if (["N", "NAO", "NÃO", "0", "FALSE", "FECHADO", "CLOSED", "F"].includes(v)) return "N";
  // Fallback: mantém o valor original para não perder dados
  return v;
}

addEventListener("DOMContentLoaded", async () => {

  // ─── NAV / SIDEBAR ─────────────────────────────────────────────────────────
  let sidebarOpen = true;

  window.toggleSidebar = function () {
    sidebarOpen = !sidebarOpen;
    document.getElementById("sidebar").classList.toggle("collapsed", !sidebarOpen);
    document.getElementById("main").classList.toggle("shifted", !sidebarOpen);
  };

  window.navigate = function (page, el) {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    el.classList.add("active");
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById("page-" + page).classList.add("active");
    const titles = { home: "Dashboard", agentes: "Agentes" };
    document.getElementById("topbar-title").textContent = titles[page];
  };

  // ─── SEMANA ────────────────────────────────────────────────────────────────
  function getSemanaInfo(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const diaSemana = d.getUTCDay() || 7;
    const seg = new Date(d); seg.setUTCDate(d.getUTCDate() - diaSemana + 1);
    const sex = new Date(seg); sex.setUTCDate(seg.getUTCDate() + 4);
    const anoRef = new Date(Date.UTC(seg.getUTCFullYear(), 0, 4));
    const diaDiff = (seg - anoRef) / 86400000;
    const numSemana = Math.ceil((diaDiff + (anoRef.getUTCDay() || 7)) / 7);
    const ano = seg.getUTCFullYear();
    const fmt = (dt, opts) => dt.toLocaleDateString("pt-BR", { ...opts, timeZone: "UTC" });
    const dm  = dt => fmt(dt, { day: "2-digit", month: "2-digit" });
    const longo = dt => fmt(dt, { day: "2-digit", month: "long", year: "numeric" });
    return {
      numero: numSemana, ano, seg, sex,
      badge:         `Semana ${numSemana} / ${ano}`,
      tituloSecao:   `Semana ${numSemana} (${dm(seg)}-${dm(sex)}/${ano})`,
      subtituloCard: `Semana ${numSemana} - ${longo(seg).replace(` de ${ano}`, "")} a ${longo(sex)}`,
    };
  }

  function aplicarSemanaUI() {
    const s = getSemanaInfo();
    const el = id => document.getElementById(id);
    if (el("week-badge"))         el("week-badge").textContent         = s.badge;
    if (el("mvp-week-sub"))       el("mvp-week-sub").textContent       = `Agentes - ${s.badge.toLowerCase()}`;
    if (el("weekly-section-sub")) el("weekly-section-sub").textContent = `Somatoria de todos os agentes - ${s.tituloSecao}`;
    if (el("weekly-card-sub"))    el("weekly-card-sub").textContent    = s.subtituloCard;
  }

  // ─── CARREGAR DADOS ────────────────────────────────────────────────────────
window.carregarVisitas = async function() {
  console.log("⏳ carregarVisitas iniciou...");
  try {
    const res = await fetch("https://sisav-api.onrender.com/sisav/adm");
    console.log("📡 Response status:", res.status);
    const data = await res.json();
    console.log("📦 Dados recebidos:", data?.length ?? data?.dados?.length);
    const raw = Array.isArray(data) ? data : (data.dados || []);
    allFieldData = raw.map(r => ({ ...r, entrada: normalizarEntrada(r.entrada) }));
    homeFiltered = [...allFieldData];
    homePage = 1;
    popularFiltrosHome();
    homeRender();
    recalcularAgentes();
    console.log("✅ carregarVisitas concluída, total:", allFieldData.length);
  } catch(err) {
    console.error("❌ carregarVisitas falhou:", err);
  }
}

  window.carregarKpis = async function() {
    const res  = await fetch("https://sisav-api.onrender.com/sisav/adm/kpis");
    const data = await res.json();
    document.getElementById("kpi-total").textContent    = data.totalRegistros;
    document.getElementById("kpi-imoveis").textContent  = data.totalImoveis;
    document.getElementById("kpi-fechados").textContent = data.totalFechados;
  }

  async function carregarResumoArea() {
    const res  = await fetch("https://sisav-api.onrender.com/sisav/adm/resumo-area");
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.dados || []);
    document.getElementById("area-tbody").innerHTML = rows.map(r => {
      const cor = r.focos >= 20 ? "pill-red" : r.focos >= 10 ? "pill-amber" : "pill-green";
      return `<tr><td>${r.rua}</td><td class="td-muted">${r.bairro}</td><td><span class="pill ${cor}">${r.focos}</span></td></tr>`;
    }).join("");
  }

  async function carregarMVPs() {
    const res  = await fetch("https://sisav-api.onrender.com/sisav/adm/desempenho-individual");
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.dados || []);
    if (!rows.length) return;

    const max = rows[0].totalRegistros || 1;
    const medalhas = ["m1", "m2", "m3"];

    document.getElementById("mvp-tbody").innerHTML = rows.map((r, i) => {
      const pct = Math.round((r.totalRegistros / max) * 100);
      const medal = i < 3 ? medalhas[i] : null;
      const medalHtml = medal
        ? `<div class="medal ${medal}">${i + 1}</div>`
        : `<div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#bbb;flex-shrink:0">${i + 1}</div>`;
      return `<tr>
        <td><div class="agent-row-inner">
          ${medalHtml}
          <div>
            <div style="font-size:13px;font-weight:500">${r.nome}</div>
            <div class="prog"><div class="prog-fill" style="width:${pct}%"></div></div>
          </div>
        </div></td>
        <td><strong>${r.totalRegistros}</strong></td>
      </tr>`;
    }).join("");
  }

  // ─── HOME TABLE ────────────────────────────────────────────────────────────
  function popularFiltrosHome() {
    const agentes = [...new Set(allFieldData.map(r => r.agente).filter(Boolean))].sort();
    const tipos   = [...new Set(allFieldData.map(r => r.tipo).filter(Boolean))].sort();
    const datas   = [...new Set(allFieldData.map(r => r.data).filter(d => d && d !== "?"))]
      .sort((a, b) => parseDateBR(b) - parseDateBR(a));

    const selAg   = document.getElementById("h-filter-agente");
    const selData = document.getElementById("h-filter-data");
    const selTipo = document.getElementById("h-filter-tipo");

    const curAg   = selAg.value;
    const curData = selData.value;
    const curTipo = selTipo.value;

    selAg.innerHTML   = `<option value="">Todos os agentes</option>` + agentes.map(a => `<option${a === curAg   ? " selected" : ""}>${a}</option>`).join("");
    selData.innerHTML = `<option value="">Todas as datas</option>`   + datas.map(d   => `<option${d === curData ? " selected" : ""}>${d}</option>`).join("");
    selTipo.innerHTML = `<option value="">Todos os tipos</option>`   + tipos.map(t   => `<option${t === curTipo ? " selected" : ""}>${t}</option>`).join("");
  }

  window.homeApplyFilters = function () {
    const ag    = document.getElementById("h-filter-agente").value;
    const data  = document.getElementById("h-filter-data").value;
    const tipo  = document.getElementById("h-filter-tipo").value;
    const info  = document.getElementById("h-filter-info").value;
    const busca = document.getElementById("h-filter-search").value.toLowerCase().trim();

    homeFiltered = allFieldData.filter(r => {
      if (ag   && r.agente !== ag)   return false;
      if (data && r.data   !== data) return false;
      if (tipo && r.tipo   !== tipo) return false;
      if (info && r.info   !== info) return false;
      if (busca && !(r.logradouro || "").toLowerCase().includes(busca)) return false;
      return true;
    });
    homePage = 1;
    homeRender();
  };

  window.homeChangePage = function (d) {
    const tot = Math.max(1, Math.ceil(homeFiltered.length / homePerPage));
    homePage = Math.min(tot, Math.max(1, homePage + d));
    homeRender();
  };

function homeRender() {
  const start = (homePage - 1) * homePerPage;
  const slice = homeFiltered.slice(start, start + homePerPage);
  const tot   = homeFiltered.length;

  // Recria o tbody do zero em vez de atualizar innerHTML
  const oldTbody = document.getElementById("home-tbody");
  const newTbody = document.createElement("tbody");
  newTbody.id = "home-tbody";
  newTbody.innerHTML = slice.map(r => {
    const realIndex   = allFieldData.indexOf(r);
    const editedClass = r._edited ? "row-edited" : "";
    return `<tr class="${editedClass}" data-index="${realIndex}">
      <td><button type="button" class="btn-edit" onclick="abrirModal(${realIndex})">Editar</button></td>
      <td>${r.data ?? "?"}</td>
      <td>${r.quarteirao ?? "?"}</td>
      <td>${r.lado ?? "?"}</td>
      <td>${r.logradouro ?? "?"}</td>
      <td class="num">${r.num ?? "?"}</td>
      <td class="num">${r.seq ?? "?"}</td>
      <td>${r.compl ?? "?"}</td>
      <td>${r.tipo ?? "?"}</td>
      <td>${r.horario ?? "?"}</td>
      <td class="num">${r.entrada === "S"
        ? '<span class="pill pill-green" style="font-size:10px">S</span>'
        : r.entrada === "N"
          ? '<span class="pill pill-red" style="font-size:10px">N</span>'
          : '<span class="pill pill-amber" style="font-size:10px">?</span>'}</td>
      <td class="num">${r.a1  ?? "?"}</td><td class="num">${r.a2  ?? "?"}</td>
      <td class="num">${r.b   ?? "?"}</td><td class="num">${r.c   ?? "?"}</td>
      <td class="num">${r.d1  ?? "?"}</td><td class="num">${r.d2  ?? "?"}</td>
      <td class="num">${r.e   ?? "?"}</td><td class="num">${r.elim ?? "?"}</td>
      <td class="num">${r.insp ?? "?"}</td>
      <td class="num">${r.amostIni ?? "?"}</td><td class="num">${r.amostFin ?? "?"}</td>
      <td class="num">${r.tubitos ?? "?"}</td>
      <td class="num">${r.queda   ?? "?"}</td>
      <td class="num">${r.depTrat ?? "?"}</td>
      <td><span class="info-badge ${r.info === "Atencao" ? "info-att" : "info-ok"}">${r.info ?? "?"}</span></td>
    </tr>`;
  }).join("");

  // Substitui o tbody antigo pelo novo no DOM
  oldTbody.parentNode.replaceChild(newTbody, oldTbody);

  document.getElementById("home-page-info").textContent =
    tot === 0 ? "Sem registros" : `${start + 1}-${Math.min(start + homePerPage, tot)} de ${tot}`;
  document.getElementById("home-btn-prev").disabled = homePage <= 1;
  document.getElementById("home-btn-next").disabled = homePage >= Math.ceil(tot / homePerPage) || tot === 0;
}

  // ─── MODAL DE EDICAO ───────────────────────────────────────────────────────
  window.abrirModal = function (idx) {
    editingIndex = idx;
    const r = allFieldData[idx];
    if (!r) return;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ""; };
    set("f-data",       r.data);
    set("f-logradouro", r.logradouro);
    set("f-num",        r.num);
    set("f-compl",      r.compl);
    set("f-quarteirao", r.quarteirao);
    set("f-lado",       r.lado);
    set("f-seq",        r.seq);
    set("f-tipo",       r.tipo);
    set("f-horario",    r.horario);
    set("f-entrada",    r.entrada);
    set("f-info",       r.info);
    set("f-a1",         r.a1);
    set("f-a2",         r.a2);
    set("f-b",          r.b);
    set("f-c",          r.c);
    set("f-d1",         r.d1);
    set("f-d2",         r.d2);
    set("f-e",          r.e);
    set("f-elim",       r.elim);
    set("f-insp",       r.insp);
    set("f-amostIni",   r.amostIni);
    set("f-amostFin",   r.amostFin);
    set("f-tubitos",    r.tubitos);
    set("f-queda",      r.queda);
    set("f-depTrat",    r.depTrat);

    document.getElementById("modal-subtitle").textContent =
      `${r.logradouro ?? "?"}, No ${r.num ?? "?"} - ${r.data ?? "?"} - Agente: ${r.agente ?? "?"}`;

    const btn = document.getElementById("btn-salvar");
    btn.classList.remove("loading");
    btn.disabled = false;

    document.getElementById("edit-overlay").classList.add("open");
    document.body.style.overflow = "hidden";
  };

  window.fecharModal = function (event) {
    if (event.target === document.getElementById("edit-overlay")) fecharModalDireto();
  };
  window.fecharModalDireto = function () {
    document.getElementById("edit-overlay").classList.remove("open");
    document.body.style.overflow = "";
    editingIndex = null;
  };

  window.salvarEdicao = async function () {
    if (editingIndex === null) return;
    const r = allFieldData[editingIndex];

    const get    = id => document.getElementById(id)?.value.trim() ?? "";
    const getNum = id => { const v = document.getElementById(id)?.value; return v === "" ? null : Number(v); };

    const visitaId = r.id ?? r.seq;

    const payload = {
      quarteirao:  get("f-quarteirao")  || undefined,
      logradouro:  get("f-logradouro")  || undefined,
      numero:      get("f-num")         || undefined,
      complemento: get("f-compl")       || undefined,
      tipoVisita:           tipoParaEnum(get("f-tipo") || r.tipo),
      informacao:           get("f-info") || undefined,
      a1: getNum("f-a1"),
      a2: getNum("f-a2"),
      b:  getNum("f-b"),
      c:  getNum("f-c"),
      d1: getNum("f-d1"),
      d2: getNum("f-d2"),
      e:  getNum("f-e"),
      depositosEliminados: getNum("f-elim"),
      amostraInicial:      getNum("f-amostIni"),
      amostraFinal:        getNum("f-amostFin"),
      qtdTubitos:          getNum("f-tubitos"),
      quedaGramas:         getNum("f-queda"),
      qtdDepTrat:          getNum("f-depTrat"),
    };

    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    const btn = document.getElementById("btn-salvar");
    btn.classList.add("loading");
    btn.disabled = true;

    let salvouNaApi = false;
    try {
      if (visitaId) {
        const resp = await fetch(`https://sisav-api.onrender.com/sisav/adm/visita/${visitaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        salvouNaApi = true;
      }
    } catch (err) {
      console.warn("PATCH falhou:", err);
    }

    // CORREÇÃO: normaliza o campo entrada ao salvar localmente também
    const novaEntrada = normalizarEntrada(get("f-entrada") || r.entrada);

    const atualizado = {
      ...r,
      quarteirao: get("f-quarteirao") || r.quarteirao,
      logradouro: get("f-logradouro") || r.logradouro,
      num:        get("f-num")        || r.num,
      compl:      get("f-compl"),
      lado:       get("f-lado")       || r.lado,
      seq:        getNum("f-seq")     ?? r.seq,
      tipo:       get("f-tipo")       || r.tipo,
      horario:    get("f-horario")    || r.horario,
      entrada:    novaEntrada,
      info:       get("f-info")       || r.info,
      a1:         getNum("f-a1")      ?? r.a1,
      a2:         getNum("f-a2")      ?? r.a2,
      b:          getNum("f-b")       ?? r.b,
      c:          getNum("f-c")       ?? r.c,
      d1:         getNum("f-d1")      ?? r.d1,
      d2:         getNum("f-d2")      ?? r.d2,
      e:          getNum("f-e")       ?? r.e,
      elim:       getNum("f-elim")    ?? r.elim,
      insp:       getNum("f-insp")    ?? r.insp,
      amostIni:   getNum("f-amostIni")?? r.amostIni,
      amostFin:   getNum("f-amostFin")?? r.amostFin,
      tubitos:    getNum("f-tubitos") ?? r.tubitos,
      queda:      getNum("f-queda")   ?? r.queda,
      depTrat:    getNum("f-depTrat") ?? r.depTrat,
      _edited:    true,
    };

    allFieldData[editingIndex] = atualizado;
    const fi = homeFiltered.indexOf(r);
    if (fi !== -1) homeFiltered[fi] = atualizado;

    homeRender();
    recalcularAgentes();

    fecharModalDireto();
    mostrarToast(
      salvouNaApi
        ? "Registro atualizado no banco de dados!"
        : "Salvo localmente (verifique a conexao com a API)",
      !salvouNaApi
    );
  };

  function tipoParaEnum(tipo) {
    const mapa = {
      "Residencia": "NORMAL",
      "Comercio":   "NORMAL",
      "TB":         "NORMAL",
      "PE":         "NORMAL",
      "Outra":      "NORMAL",
      "NORMAL":     "NORMAL",
      "R_F":        "R_F",
      "C_F":        "C_F",
      "RECUPERACAO":"RECUPERACAO",
    };
    return mapa[tipo] ?? "NORMAL";
  }

  // ─── TOAST ─────────────────────────────────────────────────────────────────
  window.mostrarToast = function (msg, erro = false) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.toggle("error", erro);
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3500);
  };

  // ─── RECALCULAR AGENTES ────────────────────────────────────────────────────
  function recalcularAgentes() {
    carregarMVPs().catch(e => console.warn("MVPs:", e));
    gerarFechamentoDiario(allFieldData);
    gerarFechamentoSemanal(allFieldData);
  }

  // ─── FECHAMENTO DIÁRIO ─────────────────────────────────────────────────────
  function gerarFechamentoDiario(registros) {
    const normalizar = str => (str || "").trim().toLowerCase();

    const mapa = {};
    registros.forEach(r => {
      const data   = (r.data   || "?").trim();
      const agente = (r.agente || "Não informado").trim();
      const chave  = `${normalizar(data)}|||${normalizar(agente)}`;

      if (!mapa[chave]) {
        mapa[chave] = {
          data,
          agente,
          fechados:      0,
          inspecionados: 0,
          a1:            0,
          a2:            0,
          b:             0,
          c:             0,
          d1:            0,
          d2:            0,
          e:             0,
          eliminados:    0,
          insp:          0,
          amostIni:      0,
          amostFin:      0,
          larvas:        0,
          queda:         0,
          depTrat:       0,
          recuperados:   0,
        };
      }

      const m = mapa[chave];

      // CORREÇÃO: a entrada já foi normalizada em carregarVisitas().
      // Conta como "fechado" apenas quando entrada === "N" explicitamente.
      // Conta como "inspecionado" apenas quando entrada === "S" explicitamente.
      // Registros com entrada null/undefined não são contados em nenhum dos dois.
      if (r.entrada === "N")      { m.fechados      += 1; }
      else if (r.entrada === "S") { m.inspecionados += 1; }

      m.a1         += Number(r.a1       || 0);
      m.a2         += Number(r.a2       || 0);
      m.b          += Number(r.b        || 0);
      m.c          += Number(r.c        || 0);
      m.d1         += Number(r.d1       || 0);
      m.d2         += Number(r.d2       || 0);
      m.e          += Number(r.e        || 0);
      m.eliminados += Number(r.elim     || 0);
      m.insp       += Number(r.insp     || 0);
      m.amostIni   += Number(r.amostIni || 0);
      m.amostFin   += Number(r.amostFin || 0);
      m.larvas     += Number(r.tubitos  || 0);
      m.queda      += Number(r.queda    || 0);
      m.depTrat    += Number(r.depTrat  || 0);
      // CORREÇÃO: recuperados deve vir de um campo próprio; aqui usamos depTrat
      // como aproximação até que a API forneça um campo dedicado.
      m.recuperados += Number(r.recuperados || r.depTrat || 0);
    });

    dailyData = Object.values(mapa).map(item => {
      const total = item.fechados + item.inspecionados;
      const razao = total > 0 ? item.fechados / total : 0;
      let status = "OK", classe = "pill-green";
      if      (razao > 0.7) { status = "Crítico"; classe = "pill-red";   }
      else if (razao > 0.5) { status = "Atenção"; classe = "pill-amber"; }
      return { ...item, status, classe };
    });

    dailyData.sort((a, b) => {
      const da = parseDateBR(a.data), db = parseDateBR(b.data);
      if (db !== da) return db - da;
      return a.agente.localeCompare(b.agente, "pt-BR");
    });

    popularFiltrosDiario();
    dailyFiltered = [...dailyData];
    dailyPage = 1;
    renderDailyTable();
  }

  // ─── FECHAMENTO SEMANAL ────────────────────────────────────────────────────
  function gerarFechamentoSemanal(registros) {
    const mapa = {};

    registros.forEach(r => {
      const agente = (r.agente || "Não informado").trim();

      if (!mapa[agente]) {
        mapa[agente] = {
          nome:          agente,
          fechados:      0,
          inspecionados: 0,
          a1:            0,
          a2:            0,
          b:             0,
          c:             0,
          d1:            0,
          d2:            0,
          e:             0,
          eliminados:    0,
          insp:          0,
          amostIni:      0,
          amostFin:      0,
          larvas:        0,
          queda:         0,
          depTrat:       0,
          recuperados:   0,
          datas:         new Set(),
        };
      }

      const m = mapa[agente];

      // CORREÇÃO: mesma lógica do diário — só conta "S" ou "N" explícitos
      if (r.entrada === "N")      { m.fechados      += 1; }
      else if (r.entrada === "S") { m.inspecionados += 1; }

      m.a1         += Number(r.a1       || 0);
      m.a2         += Number(r.a2       || 0);
      m.b          += Number(r.b        || 0);
      m.c          += Number(r.c        || 0);
      m.d1         += Number(r.d1       || 0);
      m.d2         += Number(r.d2       || 0);
      m.e          += Number(r.e        || 0);
      m.eliminados += Number(r.elim     || 0);
      m.insp       += Number(r.insp     || 0);
      m.amostIni   += Number(r.amostIni || 0);
      m.amostFin   += Number(r.amostFin || 0);
      m.larvas     += Number(r.tubitos  || 0);
      m.queda      += Number(r.queda    || 0);
      m.depTrat    += Number(r.depTrat  || 0);
      m.recuperados += Number(r.recuperados || r.depTrat || 0);

      if (r.data && r.data !== "?") m.datas.add(r.data.trim());
    });

    const rows = Object.values(mapa).map(a => ({
      ...a,
      diasTrabalhados: a.datas.size,
    }));

    const soma = campo => rows.reduce((s, r) => s + r[campo], 0);

    document.getElementById("weekly-tbody").innerHTML =
      rows.map(r => `<tr>
        <td><strong>${r.nome}</strong></td>
        <td class="num">${r.fechados}</td>
        <td class="num">${r.inspecionados}</td>
        <td class="num">${r.a1}</td>
        <td class="num">${r.a2}</td>
        <td class="num">${r.b}</td>
        <td class="num">${r.c}</td>
        <td class="num">${r.d1}</td>
        <td class="num">${r.d2}</td>
        <td class="num">${r.e}</td>
        <td class="num">${r.eliminados}</td>
        <td class="num">${r.insp}</td>
        <td class="num">${r.amostIni}</td>
        <td class="num">${r.amostFin}</td>
        <td class="num">${r.larvas}</td>
        <td class="num">${r.queda}</td>
        <td class="num">${r.depTrat}</td>
        <td class="num">${r.recuperados}</td>
        <td class="num">${r.diasTrabalhados}</td>
      </tr>`).join("") +
      `<tr class="weekly-total">
        <td>TOTAL</td>
        <td class="num">${soma("fechados")}</td>
        <td class="num">${soma("inspecionados")}</td>
        <td class="num">${soma("a1")}</td>
        <td class="num">${soma("a2")}</td>
        <td class="num">${soma("b")}</td>
        <td class="num">${soma("c")}</td>
        <td class="num">${soma("d1")}</td>
        <td class="num">${soma("d2")}</td>
        <td class="num">${soma("e")}</td>
        <td class="num">${soma("eliminados")}</td>
        <td class="num">${soma("insp")}</td>
        <td class="num">${soma("amostIni")}</td>
        <td class="num">${soma("amostFin")}</td>
        <td class="num">${soma("larvas")}</td>
        <td class="num">${soma("queda")}</td>
        <td class="num">${soma("depTrat")}</td>
        <td class="num">${soma("recuperados")}</td>
        <td class="num">—</td>
      </tr>`;
  }

  // ─── UTILITÁRIO ────────────────────────────────────────────────────────────
  function parseDateBR(str) {
    if (!str || str === "?") return 0;
    const [d, m, y] = str.split("/");
    return new Date(`${y}-${m}-${d}`).getTime() || 0;
  }

  // ─── FILTROS DIÁRIO ────────────────────────────────────────────────────────
  function popularFiltrosDiario() {
    const agentes = [...new Set(dailyData.map(r => r.agente).filter(Boolean))].sort();
    const datas   = [...new Set(dailyData.map(r => r.data).filter(d => d && d !== "?"))]
      .sort((a, b) => parseDateBR(b) - parseDateBR(a));
    const selAg = document.getElementById("d-filter-agente");
    const selDt = document.getElementById("d-filter-data");
    selAg.innerHTML = `<option value="">Todos os agentes</option>` + agentes.map(a => `<option>${a}</option>`).join("");
    selDt.innerHTML = `<option value="">Todas as datas</option>`   + datas.map(d => `<option>${d}</option>`).join("");
  }

  window.dailyApplyFilters = function () {
    const ag = document.getElementById("d-filter-agente").value;
    const dt = document.getElementById("d-filter-data").value;
    dailyFiltered = dailyData.filter(r => {
      if (ag && r.agente !== ag) return false;
      if (dt && r.data   !== dt) return false;
      return true;
    });
    dailyPage = 1;
    renderDailyTable();
  };

  window.dailyChangePage = function (d) {
    const tot = Math.max(1, Math.ceil(dailyFiltered.length / dailyPerPage));
    dailyPage = Math.min(tot, Math.max(1, dailyPage + d));
    renderDailyTable();
  };

  // ─── RENDER DAILY TABLE ────────────────────────────────────────────────────
  function renderDailyTable() {
    const start = (dailyPage - 1) * dailyPerPage;
    const slice = dailyFiltered.slice(start, start + dailyPerPage);
    const total = dailyFiltered.length;

    document.getElementById("daily-tbody").innerHTML = slice.map(r => `<tr>
      <td>${r.data}</td>
      <td><strong>${r.agente}</strong></td>
      <td class="num">${r.fechados}</td>
      <td class="num">${r.inspecionados}</td>
      <td class="num">${r.a1}</td>
      <td class="num">${r.a2}</td>
      <td class="num">${r.b}</td>
      <td class="num">${r.c}</td>
      <td class="num">${r.d1}</td>
      <td class="num">${r.d2}</td>
      <td class="num">${r.e}</td>
      <td class="num">${r.eliminados}</td>
      <td class="num">${r.insp}</td>
      <td class="num">${r.amostIni}</td>
      <td class="num">${r.amostFin}</td>
      <td class="num">${r.larvas}</td>
      <td class="num">${r.queda}</td>
      <td class="num">${r.depTrat}</td>
      <td class="num">${r.recuperados}</td>
      <td><span class="pill ${r.classe}">${r.status}</span></td>
    </tr>`).join("");

    const totalPages = Math.max(1, Math.ceil(total / dailyPerPage));
    document.getElementById("daily-page-info").textContent =
      total === 0 ? "Sem registros" : `${start + 1}-${Math.min(start + dailyPerPage, total)} de ${total}`;
    document.getElementById("daily-btn-prev").disabled = dailyPage <= 1;
    document.getElementById("daily-btn-next").disabled = dailyPage >= totalPages || total === 0;
  }

  // ─── RESUMO DO AGENTE ──────────────────────────────────────────────────────
  window.abrirResumoAgente = function () {
    const agenteFilter = document.getElementById("h-filter-agente").value;
    const base = agenteFilter
      ? allFieldData.filter(r => r.agente === agenteFilter)
      : homeFiltered;

    if (!base.length) { mostrarToast("Nenhum registro para gerar o resumo.", true); return; }

    const agentes = [...new Set(base.map(r => r.agente).filter(Boolean))];
    const bairros = [...new Set(base.map(r => r.bairro || r.quarteirao).filter(Boolean))];
    const datas   = [...new Set(base.map(r => r.data).filter(Boolean))];
    document.getElementById("r-header-info").innerHTML =
      `${datas.join(", ")}<br>Bairro: <strong>${bairros.join(", ") || "?"}</strong><br>Agente: <strong>${agentes.join(", ") || "?"}</strong>`;

    const countTipo = t => base.filter(r => (r.tipo||"").toLowerCase() === t.toLowerCase()).length;
    const residencia = countTipo("Residencia");
    const comercio   = countTipo("Comercio");
    const tb = countTipo("TB"), pe = countTipo("PE"), outra = countTipo("Outra");

    const tratFocal     = base.filter(r => r.a1 > 0 || r.a2 > 0 || r.b > 0).length;
    const tratPeriF     = base.filter(r => r.d1 > 0 || r.d2 > 0 || r.e > 0).length;
    // CORREÇÃO: usa a entrada normalizada (já "S"/"N") para contar corretamente
    const inspecionados = base.filter(r => r.entrada === "S").length;
    const fechados      = base.filter(r => r.entrada === "N").length;
    const recuperados   = base.reduce((s, r) => s + Number(r.recuperados || r.depTrat || 0), 0);
    const totalTubitos  = base.reduce((s, r) => s + Number(r.tubitos || 0), 0);
    const recusa        = base.filter(r => r.info === "Atencao").length;
    const totalElim     = base.reduce((s, r) => s + Number(r.elim    || 0), 0);
    const totalQueda    = base.reduce((s, r) => s + Number(r.queda   || 0), 0);
    const totalDepTr    = base.reduce((s, r) => s + Number(r.depTrat || 0), 0);
    const sumA1 = base.reduce((s,r)=>s+Number(r.a1||0),0);
    const sumA2 = base.reduce((s,r)=>s+Number(r.a2||0),0);
    const sumB  = base.reduce((s,r)=>s+Number(r.b ||0),0);
    const sumC  = base.reduce((s,r)=>s+Number(r.c ||0),0);
    const sumD1 = base.reduce((s,r)=>s+Number(r.d1||0),0);
    const sumD2 = base.reduce((s,r)=>s+Number(r.d2||0),0);
    const sumE  = base.reduce((s,r)=>s+Number(r.e ||0),0);
    const totalDep = sumA1+sumA2+sumB+sumC+sumD1+sumD2+sumE;
    const todosQ     = [...new Set(base.map(r=>r.quarteirao).filter(Boolean))];
    const qConcluido = todosQ.filter(q => {
      const lados = new Set(base.filter(r=>r.quarteirao===q).map(r=>r.lado).filter(Boolean));
      return lados.size >= 2;
    });

    const rf = (label, value, cls="") =>
      `<div class="r-field"><label>${label}</label><div class="r-value ${cls}">${value ?? 0}</div></div>`;

    document.getElementById("resumo-body").innerHTML = `
      <div class="r-block">
        <div class="r-block-head"><span>Numero de Imoveis trabalhados por tipo</span></div>
        <div class="r-block-body">
          <div class="r-grid r-grid-6">
            ${rf("Residencia",residencia)}${rf("Comercio",comercio)}${rf("TB",tb)}
            ${rf("PE",pe)}${rf("Outra",outra)}${rf("Total",base.length,"highlight")}
          </div>
          <div style="font-size:9px;color:#aaa;margin-top:6px">TB Terreno baldio &nbsp; PE Ponto estrategico</div>
        </div>
      </div>
      <div class="r-block">
        <div class="r-block-head"><span>Situacao dos imoveis e pendencias</span></div>
        <div class="r-block-body">
          <div class="situacao-grid">
            <div style="display:flex;flex-direction:column;gap:8px">
              <div class="r-field"><label>No Imoveis - Trat. Focal</label><div class="r-value">${tratFocal}</div></div>
              <div class="r-field"><label>Inspecionados</label><div class="r-value good">${inspecionados}</div></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div class="r-field"><label>Trat. Perifocal</label><div class="r-value">${tratPeriF}</div></div>
              <div class="r-field"><label>Recuperados</label><div class="r-value good">${recuperados}</div></div>
            </div>
            <div>
              <div class="tubitos-box">
                <div class="tubitos-num">${totalTubitos}</div>
                <div class="tubitos-label">Tubitos / Amostras</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
                <div class="r-field"><label>Pendencia - Recusa</label><div class="r-value ${recusa>0?"warn":""}">${recusa}</div></div>
                <div class="r-field"><label>Fechados</label><div class="r-value ${fechados>0?"warn":""}">${fechados}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="r-block">
        <div class="r-block-head"><span>Depositos</span></div>
        <div class="r-block-body">
          <table class="dep-table">
            <thead>
              <tr><th>Eliminado</th><th colspan="3" style="text-align:center;color:#185FA5">Tratados - Larvicida</th></tr>
              <tr><th></th><th>Tipo</th><th>Qtde. (gramas)</th><th>Qtde. Dep. Trat.</th></tr>
            </thead>
            <tbody><tr><td>${totalElim}</td><td>Temefos</td><td>${totalQueda}</td><td>${totalDepTr}</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="r-block">
        <div class="r-block-head"><span>No Depositos inspecionados por tipo</span></div>
        <div class="r-block-body">
          <div class="r-grid r-grid-8">
            ${rf("A1",sumA1)}${rf("A2",sumA2)}${rf("B",sumB)}${rf("C",sumC)}
            ${rf("D1",sumD1)}${rf("D2",sumD2)}${rf("E",sumE)}${rf("Total",totalDep,"highlight")}
          </div>
        </div>
      </div>
      <div class="r-block">
        <div class="r-block-head"><span>Quarteiraos</span></div>
        <div class="r-block-body">
          <div style="font-size:10px;color:#888;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">No e Seq. dos quarteiraos trabalhados</div>
          <div class="q-grid">${todosQ.length
            ? todosQ.map(q=>`<div class="q-chip">${q}</div>`).join("")
            : `<div style="font-size:11px;color:#aaa">?</div>`}
          </div>
          ${qConcluido.length ? `
            <div style="font-size:10px;color:#888;margin:12px 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">No e Seq. dos quarteiraos concluidos</div>
            <div class="q-grid">${qConcluido.map(q=>`<div class="q-chip concluido">${q}</div>`).join("")}</div>
          ` : ""}
        </div>
      </div>`;

    document.getElementById("resumo-overlay").classList.add("open");
    document.body.style.overflow = "hidden";
  };

  window.fecharResumo = function (event) {
    if (event.target === document.getElementById("resumo-overlay")) fecharResumoDireto();
  };
  window.fecharResumoDireto = function () {
    document.getElementById("resumo-overlay").classList.remove("open");
    document.body.style.overflow = "";
  };
  window.imprimirResumo = function () {
    const conteudo = document.getElementById("resumo-modal").outerHTML;
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>SISAV - Resumo</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif;}body{background:#f4f4f0;padding:16px;}
      .resumo-header{background:#0f3d6e;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start;}
      .resumo-header-left .resumo-supra{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.5);}
      .resumo-header-left h2{font-size:22px;font-weight:800;color:#fff;font-style:italic;}
      .resumo-status{display:inline-block;font-size:10px;font-weight:700;background:#FAEEDA;color:#854F0B;padding:3px 10px;border-radius:99px;margin-top:8px;}
      .resumo-header-right{text-align:right;font-size:11px;color:rgba(255,255,255,.7);line-height:1.8;}
      .resumo-header-right strong{color:#fff;font-weight:700;}
      .resumo-close-btn,.resumo-print-btn{display:none;}
      .resumo-body{padding:16px;display:flex;flex-direction:column;gap:14px;}
      .r-block{background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e0dfd8;}
      .r-block-head{background:#0f3d6e;padding:8px 14px;}
      .r-block-head span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#fff;}
      .r-block-body{padding:12px 14px;}
      .r-grid{display:grid;gap:8px;} .r-grid-6{grid-template-columns:repeat(6,1fr);} .r-grid-8{grid-template-columns:repeat(8,1fr);}
      .r-field{display:flex;flex-direction:column;gap:3px;}
      .r-field label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#888;font-weight:600;}
      .r-value{border:1px solid #ddd;border-radius:6px;padding:8px 10px;font-size:14px;font-weight:600;color:#1a1a18;text-align:center;background:#fafaf7;}
      .r-value.highlight{background:#0f3d6e;color:#fff;border-color:#0f3d6e;}
      .r-value.warn{background:#FAEEDA;color:#854F0B;} .r-value.good{background:#EAF3DE;color:#3B6D11;}
      .situacao-grid{display:grid;grid-template-columns:1fr 1fr 220px;gap:10px;align-items:start;}
      .tubitos-box{background:#0f3d6e;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center;min-height:80px;}
      .tubitos-num{font-size:32px;font-weight:800;color:#fff;line-height:1;}
      .tubitos-label{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.6);margin-top:3px;}
      .dep-table{width:100%;border-collapse:collapse;font-size:12px;}
      .dep-table th{font-size:9px;text-transform:uppercase;color:#888;padding:6px 8px;background:#f7f7f4;border-bottom:1px solid #eee;}
      .dep-table td{padding:8px;font-weight:600;}
      .q-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;}
      .q-chip{border:1px solid #d0e4f7;border-radius:5px;padding:5px 4px;font-size:11px;font-weight:600;color:#185FA5;background:#E6F1FB;text-align:center;}
      .q-chip.concluido{background:#0f3d6e;color:#fff;border-color:#0f3d6e;}
      @media print{body{padding:0;}}</style>
    </head><body>${conteudo}<script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  };

  // ─── EXPORTS ───────────────────────────────────────────────────────────────
  window.exportXLSX = function (data, filename) {
    const headers = ["Data","Quarteirao","Lado","Logradouro","No","Seq.","Compl.","Tipo","Horario","Entrada",
      "A1","A2","B","C","D1","D2","E","Elim.","Insp.","Amost.Ini","Amost.Fin","Tubitos","Queda(g)","Dep.Trat.","Informacao","Agente"];
    const rows = data.map(r => [r.data,r.quarteirao,r.lado,r.logradouro,r.num,r.seq,r.compl,r.tipo,r.horario,r.entrada,
      r.a1,r.a2,r.b,r.c,r.d1,r.d2,r.e,r.elim,r.insp,r.amostIni,r.amostFin,r.tubitos,r.queda,r.depTrat,r.info,r.agente]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, filename + ".xlsx");
  };

  window.exportPDF = function (data) {
    const win = window.open("", "_blank");
    const headers = ["Data","Logradouro","No","Tipo","Horario","Entrada","Elim.","Insp.","Tubitos","Info","Agente"];
    const rows = data.map(r=>[r.data,r.logradouro,r.num,r.tipo,r.horario,r.entrada,r.elim,r.insp,r.tubitos,r.info,r.agente]);
    const trs = rows.map(r=>`<tr>${r.map(c=>`<td>${c==null||c===0?"?":c}</td>`).join("")}</tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>SISAV - Campo</title>
      <style>body{font-family:system-ui,sans-serif;font-size:9px;padding:16px;}
      h2{font-size:14px;color:#185FA5;margin-bottom:12px;}table{border-collapse:collapse;width:100%;}
      th{background:#f0f0ee;border:1px solid #ddd;padding:4px 6px;font-size:8px;text-transform:uppercase;}
      td{border:1px solid #e8e7e0;padding:4px 6px;}@media print{body{padding:0;}}</style></head>
      <body><h2>SISAV ADM - Registros de Campo</h2>
      <p style="font-size:10px;color:#888;margin-bottom:10px;">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
      <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${trs}</tbody></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  };

  window.exportDailyXLSX = function () {
    const headers = [
      "Data", "Agente",
      "Im. Fechados", "Im. Inspecionados",
      "A1", "A2", "B", "C", "D1", "D2", "E",
      "Dep. Eliminados", "Insp. L1", "Amost. Ini.", "Amost. Fin.",
      "Tubitos", "Queda (g)", "Dep. Tratados", "Recuperados",
      "Status"
    ];
    const rows = dailyFiltered.map(r => [
      r.data, r.agente,
      r.fechados, r.inspecionados,
      r.a1, r.a2, r.b, r.c, r.d1, r.d2, r.e,
      r.eliminados, r.insp, r.amostIni, r.amostFin,
      r.larvas, r.queda, r.depTrat, r.recuperados,
      r.status
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fechamento Diario");
    XLSX.writeFile(wb, "SISAV_Fechamento_Diario.xlsx");
  };

  window.exportDailyPDF = function () {
    const win = window.open("", "_blank");
    const headers = [
      "Data", "Agente",
      "Fechados", "Inspecionados",
      "A1", "A2", "B", "C", "D1", "D2", "E",
      "Eliminados", "Insp. L1", "Amost.Ini", "Amost.Fin",
      "Tubitos", "Queda(g)", "Dep.Trat.", "Recuperados",
      "Status"
    ];
    const rows = dailyFiltered.map(r => [
      r.data, r.agente,
      r.fechados, r.inspecionados,
      r.a1, r.a2, r.b, r.c, r.d1, r.d2, r.e,
      r.eliminados, r.insp, r.amostIni, r.amostFin,
      r.larvas, r.queda, r.depTrat, r.recuperados,
      r.status
    ]);
    const trs = rows.map(r => `<tr>${r.map(c => `<td>${c ?? 0}</td>`).join("")}</tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>SISAV - Fechamento Diario</title>
      <style>
        body{font-family:system-ui,sans-serif;font-size:8px;padding:16px;}
        h2{font-size:13px;color:#185FA5;margin-bottom:8px;}
        p{font-size:9px;color:#888;margin-bottom:8px;}
        table{border-collapse:collapse;width:100%;}
        th{background:#f0f0ee;border:1px solid #ddd;padding:3px 4px;font-size:7px;text-transform:uppercase;text-align:center;}
        td{border:1px solid #e8e7e0;padding:3px 4px;text-align:center;}
        td:nth-child(1),td:nth-child(2){text-align:left;}
        @media print{body{padding:0;}}
      </style></head>
      <body>
        <h2>SISAV ADM - Fechamento Diario</h2>
        <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  };

  // ─── INIT ──────────────────────────────────────────────────────────────────
  aplicarSemanaUI();
  try { await carregarKpis();       } catch (e) { console.warn("KPIs:", e); }
  try { await carregarResumoArea(); } catch (e) { console.warn("Resumo area:", e); }
  try { await carregarVisitas();    } catch (e) { console.warn("Visitas:", e); }
  try { await carregarMVPs();       } catch (e) { console.warn("MVPs:", e); }

  //Realtime
  iniciarRealtimeGlobal({
    onVisita: {
      onInsert: async () => {
        await new Promise(r => setTimeout(r, 1500)); // ← delay delay para garantir que o backend processou o fechamento antes de recarregar os dados
        await carregarVisitas();
        mostrarToast("📋 Nova visita registrada!");
      },
      onUpdate: async () => {
        await new Promise(r => setTimeout(r, 1500)); // ← delay para garantir que o backend processou o fechamento antes de recarregar os dados
        await carregarVisitas();
      },
    },
    onImovelFechado: {
      onInsert: async () => {
        await new Promise(r => setTimeout(r, 1500)); // ← delay para garantir que o backend processou o fechamento antes de recarregar os dados
        await Promise.all([carregarKpis(), carregarVisitas()]);
        mostrarToast("🏠 Imóvel fechado registrado!");
      },
      onUpdate: async () => {
        await new Promise(r => setTimeout(r, 1500)); // ← delay para garantir que o backend processou o fechamento antes de recarregar os dados
        await Promise.all([carregarKpis(), carregarVisitas()]);
      },
    },
    onImovel: {
      onInsert: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await carregarKpis();
        mostrarToast("🏡 Novo imóvel adicionado!");
      },
    },
  });
});