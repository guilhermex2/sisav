  // ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
  let allFieldData = [];   // todos os registros brutos
  let homeFiltered = [];
  let homePage     = 1;
  const homePerPage = 6;

  let dailyData     = [];
  let dailyFiltered = [];
  let dailyPage     = 1;
  const dailyPerPage = 7;
  
addEventListener("DOMContentLoaded", async () => {

  // ─── NAV / SIDEBAR ───────────────────────────────────────────────────────────
  let sidebarOpen = true;

  window.toggleSidebar = function () {
    sidebarOpen = !sidebarOpen;
    document.getElementById("sidebar").classList.toggle("collapsed", !sidebarOpen);
    document.getElementById("main").classList.toggle("shifted", !sidebarOpen);
  };

  window.navigate = function (page, el) {
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    el.classList.add("active");
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.getElementById("page-" + page).classList.add("active");
    const titles = { home: "Dashboard", agentes: "Agentes" };
    document.getElementById("topbar-title").textContent = titles[page];
  };

  // ─── SEMANA ATUAL ─────────────────────────────────────────────────────────────
  /**
   * Retorna informações da semana ISO da data fornecida (default: hoje).
   * Semana ISO: começa na segunda-feira.
   */
  function getSemanaInfo(date = new Date()) {
    // Clonar para não mutar
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

    // Dia da semana ISO (1=seg … 7=dom)
    const diaSemana = d.getUTCDay() || 7;

    // Segunda da semana atual
    const seg = new Date(d);
    seg.setUTCDate(d.getUTCDate() - diaSemana + 1);

    // Sexta da semana atual
    const sex = new Date(seg);
    sex.setUTCDate(seg.getUTCDate() + 4);

    // Número da semana ISO
    const anoRef = new Date(Date.UTC(seg.getUTCFullYear(), 0, 4)); // 4 jan sempre está na sem 1
    const diaDiff = (seg - anoRef) / 86400000;
    const numSemana = Math.ceil((diaDiff + (anoRef.getUTCDay() || 7)) / 7);

    const ano = seg.getUTCFullYear();

    // Formatos de datas
    const fmtCurto = (dt) =>
      dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

    const fmtLongo = (dt) =>
      dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

    const fmtDiaMes = (dt) =>
      dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

    return {
      numero: numSemana,          // ex: 16
      ano,                        // ex: 2026
      seg, sex,
      badge:    `Semana ${numSemana} / ${ano}`,                                         // topbar
      intervalo: `${fmtDiaMes(seg)}–${fmtDiaMes(sex)}/${ano}`,                         // curto ex: 13/04–17/04/2026
      tituloSecao: `Semana ${numSemana} (${fmtDiaMes(seg)}–${fmtDiaMes(sex)}/${ano})`, // section title bar
      subtituloCard: `Semana ${numSemana} · ${fmtLongo(seg).replace(` de ${ano}`, "")} a ${fmtLongo(sex)}`, // weekly card
    };
  }

  function aplicarSemanaUI() {
    const s = getSemanaInfo();

    // 1. Topbar badge
    const badge = document.getElementById("week-badge");
    if (badge) badge.textContent = s.badge;

    // 2. Subtítulo do card "Desempenho individual" (home)
    const mvpSub = document.getElementById("mvp-week-sub");
    if (mvpSub) mvpSub.textContent = `Agentes · ${s.badge.toLowerCase()}`;

    // 3. Span da section title bar do fechamento semanal
    const secSpan = document.getElementById("weekly-section-sub");
    if (secSpan) secSpan.textContent = `Somatória de todos os agentes · ${s.tituloSecao}`;

    // 4. Subtítulo do weekly card
    const weeklySub = document.getElementById("weekly-card-sub");
    if (weeklySub) weeklySub.textContent = s.subtituloCard;
  }


  // ─── CARREGAR DADOS ───────────────────────────────────────────────────────────
  async function carregarVisitas() {
    const res  = await fetch("http://localhost:4000/sisav/adm");
    const data = await res.json();
    allFieldData = Array.isArray(data) ? data : (data.dados || []);
    homeFiltered = [...allFieldData];
    homePage = 1;
    popularFiltrosHome();
    homeRender();
    gerarFechamentoDiario(allFieldData);
  }

  async function carregarKpis() {
    const res  = await fetch("http://localhost:4000/sisav/adm/kpis");
    const data = await res.json();
    document.getElementById("kpi-total").textContent   = data.totalRegistros;
    document.getElementById("kpi-imoveis").textContent = data.totalImoveis;
    document.getElementById("kpi-fechados").textContent = data.totalFechados;
  }

  async function carregarResumoArea() {
    const res  = await fetch("http://localhost:4000/sisav/adm/resumo-area");
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.dados || []);
    document.getElementById("area-tbody").innerHTML = rows
      .map((r) => {
        const cor = r.focos >= 20 ? "pill-red" : r.focos >= 10 ? "pill-amber" : "pill-green";
        return `<tr>
          <td>${r.rua}</td>
          <td class="td-muted">${r.bairro}</td>
          <td><span class="pill ${cor}">${r.focos}</span></td>
        </tr>`;
      })
      .join("");
  }

  async function carregarMVPs() {
    const res  = await fetch("http://localhost:4000/sisav/adm/desempenho-individual");
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.dados || []);
    if (!rows.length) return;

    const ordenado = [...rows].sort((a, b) => b.totalRegistros - a.totalRegistros);
    const top3 = ordenado.slice(0, 3);
    const max  = top3[0].totalRegistros || 1;
    const medals = ["m1", "m2", "m3"];

    document.getElementById("mvp-tbody").innerHTML = top3
      .map((r, i) => {
        const pct = Math.round((r.totalRegistros / max) * 100);
        return `<tr>
          <td>
            <div class="agent-row-inner">
              <div class="medal ${medals[i]}">${i + 1}°</div>
              <div>
                <div style="font-size:13px;font-weight:500">${r.nome}</div>
                <div class="prog"><div class="prog-fill" style="width:${pct}%"></div></div>
              </div>
            </div>
          </td>
          <td><strong>${r.totalRegistros}</strong></td>
        </tr>`;
      })
      .join("");
  }

  // ─── HOME TABLE ───────────────────────────────────────────────────────────────
  function popularFiltrosHome() {
    const agentes = [...new Set(allFieldData.map((r) => r.agente).filter(Boolean))].sort();
    const tipos   = [...new Set(allFieldData.map((r) => r.tipo).filter(Boolean))].sort();

    const selAg  = document.getElementById("h-filter-agente");
    const selTipo = document.getElementById("h-filter-tipo");

    // preserva valor atual se já havia sido selecionado
    const curAg   = selAg.value;
    const curTipo = selTipo.value;

    selAg.innerHTML  = `<option value="">Todos os agentes</option>` + agentes.map((a) => `<option${a === curAg ? " selected" : ""}>${a}</option>`).join("");
    selTipo.innerHTML = `<option value="">Todos os tipos</option>` + tipos.map((t) => `<option${t === curTipo ? " selected" : ""}>${t}</option>`).join("");
  }

  window.homeApplyFilters = function () {
    const ag     = document.getElementById("h-filter-agente").value;
    const tipo   = document.getElementById("h-filter-tipo").value;
    const info   = document.getElementById("h-filter-info").value;
    const busca  = document.getElementById("h-filter-search").value.toLowerCase().trim();

    homeFiltered = allFieldData.filter((r) => {
      if (ag    && r.agente   !== ag)   return false;
      if (tipo  && r.tipo     !== tipo) return false;
      if (info  && r.info     !== info) return false;
      if (busca && !(r.logradouro || "").toLowerCase().includes(busca)) return false;
      return true;
    });

    homePage = 1;
    homeRender();
  };

  window.homeChangePage = function (d) {
    const totalPages = Math.max(1, Math.ceil(homeFiltered.length / homePerPage));
    homePage = Math.min(totalPages, Math.max(1, homePage + d));
    homeRender();
  };

  function homeRender() {
    const start = (homePage - 1) * homePerPage;
    const slice = homeFiltered.slice(start, start + homePerPage);
    const tot   = homeFiltered.length;

    document.getElementById("home-tbody").innerHTML = slice
      .map(
        (r) => `<tr>
          <td>${r.data ?? "—"}</td>
          <td>${r.quarteirao ?? "—"}</td>
          <td>${r.lado ?? "—"}</td>
          <td>${r.logradouro ?? "—"}</td>
          <td class="num">${r.num ?? "—"}</td>
          <td class="num">${r.seq ?? "—"}</td>
          <td>${r.compl ?? "—"}</td>
          <td>${r.tipo ?? "—"}</td>
          <td>${r.horario ?? "—"}</td>
          <td class="num">${
            r.entrada === "S"
              ? '<span class="pill pill-green" style="font-size:10px">S</span>'
              : '<span class="pill pill-red" style="font-size:10px">N</span>'
          }</td>
          <td class="num">${r.a1  ?? "—"}</td><td class="num">${r.a2  ?? "—"}</td>
          <td class="num">${r.b   ?? "—"}</td><td class="num">${r.c   ?? "—"}</td>
          <td class="num">${r.d1  ?? "—"}</td><td class="num">${r.d2  ?? "—"}</td>
          <td class="num">${r.e   ?? "—"}</td><td class="num">${r.elim ?? "—"}</td>
          <td class="num">${r.insp ?? "—"}</td>
          <td class="num">${r.amostIni ?? "—"}</td><td class="num">${r.amostFin ?? "—"}</td>
          <td class="num">${r.tubitos ?? "—"}</td>
          <td class="num">${r.queda   ?? "—"}</td>
          <td class="num">${r.depTrat ?? "—"}</td>
          <td><span class="info-badge ${r.info === "Atenção" ? "info-att" : "info-ok"}">${r.info ?? "—"}</span></td>
        </tr>`
      )
      .join("");

    document.getElementById("home-page-info").textContent =
      tot === 0 ? "Sem registros" : `${start + 1}–${Math.min(start + homePerPage, tot)} de ${tot}`;
    document.getElementById("home-btn-prev").disabled = homePage <= 1;
    document.getElementById("home-btn-next").disabled =
      homePage >= Math.ceil(tot / homePerPage) || tot === 0;
  }

  // ─── FECHAMENTO DIÁRIO ────────────────────────────────────────────────────────
  function gerarFechamentoDiario(registros) {
    const mapa = {};

    registros.forEach((r) => {
      const data   = r.data   || "—";
      const agente = r.agente || "Não informado";
      const chave  = `${data}|||${agente}`;

      if (!mapa[chave]) {
        mapa[chave] = { data, agente, fechados: 0, inspecionados: 0, eliminados: 0, larvas: 0, recuperados: 0 };
      }

      if (r.entrada === "N") {
        mapa[chave].fechados += 1;
      } else {
        mapa[chave].inspecionados += 1;
      }

      mapa[chave].eliminados  += Number(r.elim   || 0);
      mapa[chave].larvas      += Number(r.tubitos || 0);
      mapa[chave].recuperados += Number(r.depTrat || 0);
    });

    dailyData = Object.values(mapa).map((item) => {
      const total  = item.fechados + item.inspecionados;
      const razao  = total > 0 ? item.fechados / total : 0;
      let status   = "OK";
      let classe   = "pill-green";

      if (razao > 0.7) { status = "Crítico";  classe = "pill-red";   }
      else if (razao > 0.5) { status = "Atenção"; classe = "pill-amber"; }

      return { ...item, status, classe };
    });

    // ordenar: data desc, agente asc
    dailyData.sort((a, b) => {
      const da = parseDateBR(a.data);
      const db = parseDateBR(b.data);
      if (db !== da) return db - da;
      return a.agente.localeCompare(b.agente);
    });

    popularFiltrosDiario();
    dailyFiltered = [...dailyData];
    dailyPage = 1;
    renderDailyTable();
  }

  // converte "DD/MM/AAAA" → timestamp para ordenação
  function parseDateBR(str) {
    if (!str || str === "—") return 0;
    const [d, m, y] = str.split("/");
    return new Date(`${y}-${m}-${d}`).getTime() || 0;
  }

  function popularFiltrosDiario() {
    const agentes = [...new Set(dailyData.map((r) => r.agente).filter(Boolean))].sort();
    const datas   = [...new Set(dailyData.map((r) => r.data).filter((d) => d && d !== "—"))].sort(
      (a, b) => parseDateBR(b) - parseDateBR(a)
    );

    const selAg = document.getElementById("d-filter-agente");
    const selDt = document.getElementById("d-filter-data");

    selAg.innerHTML = `<option value="">Todos os agentes</option>` + agentes.map((a) => `<option>${a}</option>`).join("");
    selDt.innerHTML = `<option value="">Todas as datas</option>`   + datas.map((d) => `<option>${d}</option>`).join("");
  }

  window.dailyApplyFilters = function () {
    const ag = document.getElementById("d-filter-agente").value;
    const dt = document.getElementById("d-filter-data").value;

    dailyFiltered = dailyData.filter((r) => {
      if (ag && r.agente !== ag) return false;
      if (dt && r.data   !== dt) return false;
      return true;
    });

    dailyPage = 1;
    renderDailyTable();
  };

  window.dailyChangePage = function (d) {
    const totalPages = Math.max(1, Math.ceil(dailyFiltered.length / dailyPerPage));
    dailyPage = Math.min(totalPages, Math.max(1, dailyPage + d));
    renderDailyTable();
  };

  function renderDailyTable() {
    const start = (dailyPage - 1) * dailyPerPage;
    const slice = dailyFiltered.slice(start, start + dailyPerPage);
    const total = dailyFiltered.length;

    document.getElementById("daily-tbody").innerHTML = slice
      .map(
        (r) => `<tr>
          <td>${r.data}</td>
          <td><strong>${r.agente}</strong></td>
          <td class="num">${r.fechados}</td>
          <td class="num">${r.inspecionados}</td>
          <td class="num">${r.eliminados}</td>
          <td class="num">${r.larvas}</td>
          <td class="num">${r.recuperados}</td>
          <td><span class="pill ${r.classe}">${r.status}</span></td>
        </tr>`
      )
      .join("");

    const totalPages = Math.max(1, Math.ceil(total / dailyPerPage));
    document.getElementById("daily-page-info").textContent =
      total === 0 ? "Sem registros" : `${start + 1}–${Math.min(start + dailyPerPage, total)} de ${total}`;
    document.getElementById("daily-btn-prev").disabled = dailyPage <= 1;
    document.getElementById("daily-btn-next").disabled = dailyPage >= totalPages || total === 0;
  }

  // ─── FECHAMENTO SEMANAL ───────────────────────────────────────────────────────
  async function renderWeekly() {
    const res  = await fetch("http://localhost:4000/sisav/adm/desempenho-individual");
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.dados || []);

    const totFechados     = rows.reduce((s, r) => s + (r.fechados     || 0), 0);
    const totInspecionados= rows.reduce((s, r) => s + (r.inspecionados|| 0), 0);
    const totEliminados   = rows.reduce((s, r) => s + (r.eliminados   || 0), 0);
    const totLarvas       = rows.reduce((s, r) => s + (r.tratados     || r.larvas || 0), 0);
    const totRecuperados  = rows.reduce((s, r) => s + (r.recuperados  || 0), 0);

    document.getElementById("weekly-tbody").innerHTML =
      rows
        .map(
          (r) => `<tr>
          <td><strong>${r.nome}</strong></td>
          <td class="num">${r.fechados      ?? "—"}</td>
          <td class="num">${r.inspecionados ?? "—"}</td>
          <td class="num">${r.eliminados    ?? "—"}</td>
          <td class="num">${r.tratados ?? r.larvas ?? "—"}</td>
          <td class="num">${r.recuperados   ?? "—"}</td>
          <td class="num">${r.diasTrabalhados ?? "—"}</td>
        </tr>`
        )
        .join("") +
      `<tr class="weekly-total">
        <td>🏁 TOTAL</td>
        <td class="num">${totFechados}</td>
        <td class="num">${totInspecionados}</td>
        <td class="num">${totEliminados}</td>
        <td class="num">${totLarvas}</td>
        <td class="num">${totRecuperados}</td>
        <td class="num">—</td>
      </tr>`;
  }

  // ─── EXPORTS ──────────────────────────────────────────────────────────────────
  window.exportXLSX = function (data, filename) {
    const headers = [
      "Data","Quarteirão","Lado","Logradouro","Nº","Seq.","Compl.","Tipo","Horário","Entrada",
      "A1","A2","B","C","D1","D2","E","Elim.","Insp.","Amost.Ini","Amost.Fin",
      "Tubitos","Queda(g)","Dep.Trat.","Informação","Agente"
    ];
    const rows = data.map((r) => [
      r.data,r.quarteirao,r.lado,r.logradouro,r.num,r.seq,r.compl,r.tipo,r.horario,r.entrada,
      r.a1,r.a2,r.b,r.c,r.d1,r.d2,r.e,r.elim,r.insp,r.amostIni,r.amostFin,
      r.tubitos,r.queda,r.depTrat,r.info,r.agente
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, filename + ".xlsx");
  };

  window.exportPDF = function (data) {
    const win = window.open("", "_blank");
    const headers = ["Data","Logradouro","Nº","Tipo","Horário","Entrada","Elim.","Insp.","Tubitos","Info","Agente"];
    const rows = data.map((r) => [
      r.data, r.logradouro, r.num, r.tipo, r.horario, r.entrada,
      r.elim, r.insp, r.tubitos, r.info, r.agente
    ]);
    const trs = rows.map((r) => `<tr>${r.map((c) => `<td>${c == null || c === 0 ? "—" : c}</td>`).join("")}</tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>SISAV - Campo</title>
      <style>body{font-family:system-ui,sans-serif;font-size:9px;padding:16px;}
      h2{font-size:14px;color:#185FA5;margin-bottom:12px;}
      table{border-collapse:collapse;width:100%;}
      th{background:#f0f0ee;border:1px solid #ddd;padding:4px 6px;font-size:8px;text-transform:uppercase;}
      td{border:1px solid #e8e7e0;padding:4px 6px;}
      @media print{body{padding:0;}}</style></head>
      <body><h2>SISAV ADM — Registros de Campo</h2>
      <p style="font-size:10px;color:#888;margin-bottom:10px;">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${trs}</tbody></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  };

  window.exportDailyXLSX = function () {
    const headers = ["Data","Agente","Imóveis Fechados","Imóveis Inspecionados","Depósitos Eliminados","Larvas Tratadas","Recuperados","Status"];
    const rows = dailyFiltered.map((r) => [r.data, r.agente, r.fechados, r.inspecionados, r.eliminados, r.larvas, r.recuperados, r.status]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fechamento Diário");
    XLSX.writeFile(wb, "SISAV_Fechamento_Diario.xlsx");
  };

  window.exportDailyPDF = function () {
    const win = window.open("", "_blank");
    const headers = ["Data","Agente","Im. Fechados","Im. Inspecionados","Dep. Eliminados","Larvas Tratadas","Recuperados","Status"];
    const rows = dailyFiltered.map((r) => [r.data, r.agente, r.fechados, r.inspecionados, r.eliminados, r.larvas, r.recuperados, r.status]);
    const trs = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>SISAV - Fechamento Diário</title>
      <style>body{font-family:system-ui,sans-serif;font-size:10px;padding:16px;}
      h2{font-size:14px;color:#185FA5;margin-bottom:12px;}
      table{border-collapse:collapse;width:100%;}
      th{background:#f0f0ee;border:1px solid #ddd;padding:5px 8px;font-size:9px;text-transform:uppercase;}
      td{border:1px solid #e8e7e0;padding:5px 8px;}
      @media print{body{padding:0;}}</style></head>
      <body><h2>SISAV ADM — Fechamento Diário</h2>
      <p style="font-size:10px;color:#888;margin-bottom:10px;">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${trs}</tbody></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  };

  // ─── INIT ─────────────────────────────────────────────────────────────────────
  aplicarSemanaUI(); // atualiza semana em todos os pontos da UI imediatamente
  try { await carregarKpis();       } catch (e) { console.warn("KPIs:", e); }
  try { await carregarResumoArea(); } catch (e) { console.warn("Resumo área:", e); }
  try { await carregarMVPs();       } catch (e) { console.warn("MVPs:", e); }
  try { await renderWeekly();       } catch (e) { console.warn("Weekly:", e); }
  try { await carregarVisitas();    } catch (e) { console.warn("Visitas:", e); } // chama gerarFechamentoDiario internamente
});