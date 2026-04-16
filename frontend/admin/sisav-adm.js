  addEventListener("DOMContentLoaded", async() => {

    // ---- DATA ----
    const fieldData = [
      {data:"14/04/2026",quarteirao:"Q-01",lado:"Par",logradouro:"Rua Sagitário",num:"12",seq:"001",compl:"—",tipo:"Residencial",horario:"08:00",entrada:"S",a1:1,a2:0,b:0,c:1,d1:0,d2:0,e:0,elim:0,insp:1,amostIni:1,amostFin:1,tubitos:2,queda:5,depTrat:1,info:"Normal",agente:"João Silva"},
      {data:"14/04/2026",quarteirao:"Q-01",lado:"Par",logradouro:"Rua Sagitário",num:"14",seq:"002",compl:"Ap 2",tipo:"Residencial",horario:"08:15",entrada:"S",a1:0,a2:1,b:1,c:0,d1:0,d2:1,e:0,elim:1,insp:1,amostIni:2,amostFin:2,tubitos:1,queda:0,depTrat:0,info:"Atenção",agente:"João Silva"},
      {data:"14/04/2026",quarteirao:"Q-02",lado:"Ímpar",logradouro:"Rua Sagitário",num:"23",seq:"003",compl:"—",tipo:"Comercial",horario:"08:30",entrada:"N",a1:0,a2:0,b:0,c:0,d1:1,d2:0,e:1,elim:0,insp:0,amostIni:0,amostFin:0,tubitos:0,queda:0,depTrat:0,info:"Normal",agente:"Marina Souza"},
      {data:"14/04/2026",quarteirao:"Q-02",lado:"Ímpar",logradouro:"Emburrado",num:"45",seq:"004",compl:"Sala 1",tipo:"Comercial",horario:"09:00",entrada:"S",a1:2,a2:0,b:0,c:2,d1:0,d2:0,e:0,elim:0,insp:1,amostIni:3,amostFin:4,tubitos:3,queda:10,depTrat:2,info:"Atenção",agente:"Marina Souza"},
      {data:"14/04/2026",quarteirao:"Q-03",lado:"Par",logradouro:"Emburrado",num:"60",seq:"005",compl:"—",tipo:"Terreno",horario:"09:20",entrada:"S",a1:0,a2:0,b:2,c:0,d1:0,d2:0,e:2,elim:1,insp:1,amostIni:5,amostFin:5,tubitos:0,queda:0,depTrat:0,info:"Normal",agente:"Alana Cardoso"},
      {data:"14/04/2026",quarteirao:"Q-04",lado:"Ímpar",logradouro:"Av. N. S. Aparecida",num:"102",seq:"008",compl:"—",tipo:"Comercial",horario:"10:30",entrada:"S",a1:3,a2:1,b:0,c:1,d1:0,d2:0,e:1,elim:2,insp:1,amostIni:7,amostFin:9,tubitos:4,queda:15,depTrat:3,info:"Atenção",agente:"João Silva"},
      {data:"13/04/2026",quarteirao:"Q-01",lado:"Par",logradouro:"Rua Guanambi",num:"7",seq:"001",compl:"—",tipo:"Residencial",horario:"08:00",entrada:"S",a1:1,a2:1,b:0,c:0,d1:1,d2:0,e:0,elim:0,insp:1,amostIni:1,amostFin:1,tubitos:1,queda:5,depTrat:1,info:"Normal",agente:"Alana Cardoso"},
      {data:"13/04/2026",quarteirao:"Q-02",lado:"Par",logradouro:"Rua Sagitário",num:"30",seq:"002",compl:"—",tipo:"Residencial",horario:"08:30",entrada:"S",a1:0,a2:0,b:1,c:1,d1:0,d2:0,e:0,elim:1,insp:1,amostIni:2,amostFin:3,tubitos:2,queda:5,depTrat:1,info:"Normal",agente:"João Silva"},
      {data:"13/04/2026",quarteirao:"Q-03",lado:"Ímpar",logradouro:"Emburrado",num:"55",seq:"003",compl:"—",tipo:"Terreno",horario:"09:00",entrada:"N",a1:0,a2:0,b:0,c:0,d1:0,d2:0,e:0,elim:0,insp:0,amostIni:0,amostFin:0,tubitos:0,queda:0,depTrat:0,info:"Normal",agente:"Marina Souza"},
    ];

    const dailyData = [
      {data:"14/04/2026",agente:"João Silva",   fechados:12,inspecionados:14,eliminados:3,larvas:5,recuperados:2},
      {data:"14/04/2026",agente:"Marina Souza", fechados:10,inspecionados:12,eliminados:1,larvas:3,recuperados:1},
      {data:"14/04/2026",agente:"Alana Cardoso",fechados:9, inspecionados:11,eliminados:2,larvas:4,recuperados:0},
      {data:"13/04/2026",agente:"João Silva",   fechados:11,inspecionados:13,eliminados:2,larvas:4,recuperados:1},
      {data:"13/04/2026",agente:"Marina Souza", fechados:8, inspecionados:10,eliminados:1,larvas:2,recuperados:2},
      {data:"13/04/2026",agente:"Alana Cardoso",fechados:10,inspecionados:12,eliminados:3,larvas:3,recuperados:1},
      {data:"12/04/2026",agente:"João Silva",   fechados:13,inspecionados:15,eliminados:4,larvas:6,recuperados:0},
      {data:"12/04/2026",agente:"Marina Souza", fechados:9, inspecionados:10,eliminados:2,larvas:3,recuperados:3},
      {data:"12/04/2026",agente:"Alana Cardoso",fechados:8, inspecionados:9, eliminados:1,larvas:2,recuperados:1},
      {data:"11/04/2026",agente:"João Silva",   fechados:10,inspecionados:12,eliminados:2,larvas:3,recuperados:2},
      {data:"11/04/2026",agente:"Marina Souza", fechados:11,inspecionados:13,eliminados:3,larvas:5,recuperados:0},
      {data:"11/04/2026",agente:"Alana Cardoso",fechados:7, inspecionados:9, eliminados:1,larvas:1,recuperados:1},
      {data:"10/04/2026",agente:"João Silva",   fechados:9, inspecionados:11,eliminados:2,larvas:4,recuperados:1},
      {data:"10/04/2026",agente:"Marina Souza", fechados:8, inspecionados:10,eliminados:1,larvas:2,recuperados:2},
      {data:"10/04/2026",agente:"Alana Cardoso",fechados:11,inspecionados:13,eliminados:3,larvas:5,recuperados:0},
    ];

    // ---- NAV ----
    let sidebarOpen = true;
    function toggleSidebar() {
      sidebarOpen = !sidebarOpen;
      document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
      document.getElementById('main').classList.toggle('shifted', !sidebarOpen);
    }
    function navigate(page, el) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      const titles = {home:'Dashboard', agentes:'Agentes'};
      document.getElementById('topbar-title').textContent = titles[page];
    }

    window.navigate = navigate; 

    // ---- HOME TABLE ----
    let homeFiltered = [];
    let homePage = 1;
    const homePerPage = 6;

    async function carregarVisitas() {
      const res = await fetch('http://localhost:4000/sisav/adm');
      const data = await res.json();

      homeFiltered = data;
      homeRender();
    }
    function homeRender() {
      const start = (homePage-1)*homePerPage;
      const slice = homeFiltered.slice(start, start+homePerPage);
      document.getElementById('home-tbody').innerHTML = slice.map(r => `<tr>
        <td>${r.data}</td><td>${r.quarteirao}</td><td>${r.lado}</td><td>${r.logradouro}</td>
        <td class="num">${r.num}</td><td class="num">${r.seq}</td><td>${r.compl}</td><td>${r.tipo}</td>
        <td>${r.horario}</td>
        <td class="num">${r.entrada==='S'?'<span class="pill pill-green" style="font-size:10px">S</span>':'<span class="pill pill-red" style="font-size:10px">N</span>'}</td>
        <td class="num">${r.a1||'—'}</td><td class="num">${r.a2||'—'}</td><td class="num">${r.b||'—'}</td>
        <td class="num">${r.c||'—'}</td><td class="num">${r.d1||'—'}</td><td class="num">${r.d2||'—'}</td>
        <td class="num">${r.e||'—'}</td><td class="num">${r.elim||'—'}</td><td class="num">${r.insp||'—'}</td>
        <td class="num">${r.amostIni||'—'}</td><td class="num">${r.amostFin||'—'}</td>
        <td class="num">${r.tubitos||'—'}</td><td class="num">${r.queda||'—'}</td><td class="num">${r.depTrat||'—'}</td>
        <td><span class="info-badge ${r.info==='Atenção'?'info-att':'info-ok'}">${r.info}</span></td>
      </tr>`).join('');
      const tot = homeFiltered.length;
      document.getElementById('home-page-info').textContent = `${start+1}–${Math.min(start+homePerPage,tot)} de ${tot}`;
      document.getElementById('home-btn-prev').disabled = homePage<=1;
      document.getElementById('home-btn-next').disabled = homePage>=Math.ceil(tot/homePerPage)||tot===0;
    }
    function homeChangePage(d) {
      homePage = Math.max(1,Math.min(Math.ceil(homeFiltered.length/homePerPage)||1, homePage+d));
      homeRender();
    }
    async function carregarResumoArea() {
      const res = await fetch('http://localhost:4000/sisav/adm/resumo-area');
      const data = await res.json();

      const rows = data.dados;

      document.getElementById('area-tbody').innerHTML =
        rows.map(r => `
          <tr>
            <td>${r.rua}</td>
            <td>${r.bairro}</td>
            <td class="num">${r.focos}</td>
          </tr>
        `).join('');
    }

    async function carregarKpis() {
      const res = await fetch('http://localhost:4000/sisav/adm/kpis');
      const data = await res.json();

      console.log("KPIs:", data);

      document.getElementById('kpi-total').textContent = data.totalRegistros;
      document.getElementById('kpi-imoveis').textContent = data.totalImoveis;
      document.getElementById('kpi-fechados').textContent = data.totalFechados;
    }

    async function carregarMVPs() {
      const res = await fetch('http://localhost:4000/sisav/adm/desempenho-individual')
      const data = await res.json()

      console.log("MVPS:", data);
    }
    // ---- DAILY TABLE ----
    let dailyFiltered = [...dailyData];
    let dailyPage = 1;
    const dailyPerPage = 7;
    function dailyApplyFilters() {
      const ag = document.getElementById('d-filter-agente').value;
      const dt = document.getElementById('d-filter-data').value;
      dailyFiltered = dailyData.filter(r => (!ag||r.agente===ag)&&(!dt||r.data===dt));
      dailyPage = 1; dailyRender();
    }
    function statusBadge(r) {
      const score = r.fechados + r.inspecionados;
      if(score >= 24) return '<span class="pill pill-green" style="font-size:11px">Excelente</span>';
      if(score >= 18) return '<span class="pill pill-amber" style="font-size:11px">Regular</span>';
      return '<span class="pill pill-red" style="font-size:11px">Abaixo</span>';
    }
    function dailyRender() {
      const start = (dailyPage-1)*dailyPerPage;
      const slice = dailyFiltered.slice(start, start+dailyPerPage);
      document.getElementById('daily-tbody').innerHTML = slice.map(r => `<tr>
        <td>${r.data}</td>
        <td><strong>${r.agente}</strong></td>
        <td class="num"><span class="stat-chip blue">${r.fechados}</span></td>
        <td class="num"><span class="stat-chip green">${r.inspecionados}</span></td>
        <td class="num"><span class="stat-chip red">${r.eliminados}</span></td>
        <td class="num"><span class="stat-chip amber">${r.larvas}</span></td>
        <td class="num"><span class="stat-chip purple">${r.recuperados}</span></td>
        <td>${statusBadge(r)}</td>
      </tr>`).join('');
      const tot = dailyFiltered.length;
      document.getElementById('daily-page-info').textContent = `${start+1}–${Math.min(start+dailyPerPage,tot)} de ${tot}`;
      document.getElementById('daily-btn-prev').disabled = dailyPage<=1;
      document.getElementById('daily-btn-next').disabled = dailyPage>=Math.ceil(tot/dailyPerPage)||tot===0;
    }
    function dailyChangePage(d) {
      dailyPage = Math.max(1,Math.min(Math.ceil(dailyFiltered.length/dailyPerPage)||1, dailyPage+d));
      dailyRender();
    }

    // ---- WEEKLY TABLE ----
    //TABELA DE FECHAMENTO SEMANAL
    async function renderWeekly() {
      const res = await fetch('http://localhost:4000/sisav/adm/desempenho-individual');
      const data = await res.json();
      console.log("WEEKLY BACKEND:", data);
      const rows = data.dados;

      const totals = {
        fechados: rows.reduce((s,r)=>s+r.fechados,0),
        inspecionados: rows.reduce((s,r)=>s+r.inspecionados,0),
        eliminados: rows.reduce((s,r)=>s+r.eliminados,0),
        larvas: rows.reduce((s,r)=>s+r.tratados,0),
        recuperados: rows.reduce((s,r)=>s+r.recuperados,0),
        dias: 0
      };

      document.getElementById('weekly-tbody').innerHTML =
        rows.map((r,i) => `<tr>
          <td><strong>${r.nome}</strong></td>
          <td class="num">${r.fechados}</td>
          <td class="num">${r.inspecionados}</td>
          <td class="num">${r.eliminados}</td>
          <td class="num">${r.tratados}</td>
          <td class="num">${r.recuperados}</td>
          <td class="num">—</td>
        </tr>`).join('') +
        `<tr class="weekly-total">
          <td>🏁 TOTAL</td>
          <td>${totals.fechados}</td>
          <td>${totals.inspecionados}</td>
          <td>${totals.eliminados}</td>
          <td>${totals.larvas}</td>
          <td>${totals.recuperados}</td>
          <td>—</td>
        </tr>`;
    }

    // ---- EXPORTS ----
    function exportXLSX(data, filename) {
      const headers = ["Data","Quarteirão","Lado","Logradouro","Nº","Seq.","Compl.","Tipo","Horário","Entrada","A1","A2","B","C","D1","D2","E","Elim.","Insp.","Amost.Ini","Amost.Fin","Tubitos","Queda(g)","Dep.Trat.","Informação","Agente"];
      const rows = data.map(r=>[r.data,r.quarteirao,r.lado,r.logradouro,r.num,r.seq,r.compl,r.tipo,r.horario,r.entrada,r.a1,r.a2,r.b,r.c,r.d1,r.d2,r.e,r.elim,r.insp,r.amostIni,r.amostFin,r.tubitos,r.queda,r.depTrat,r.info,r.agente]);
      const ws = XLSX.utils.aoa_to_sheet([headers,...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,"Dados");
      XLSX.writeFile(wb, filename+'.xlsx');
    }
    function exportPDF(data) {
      const win = window.open('','_blank');
      const headers = ["Data","Logradouro","Nº","Tipo","Horário","Entrada","Elim.","Insp.","Tubitos","Info","Agente"];
      const rows = data.map(r=>[r.data,r.logradouro,r.num,r.tipo,r.horario,r.entrada,r.elim,r.insp,r.tubitos,r.info,r.agente]);
      const trs = rows.map(r=>`<tr>${r.map(c=>`<td>${c===0?'—':c}</td>`).join('')}</tr>`).join('');
      win.document.write(`<!DOCTYPE html><html><head><title>SISAV - Campo</title><style>body{font-family:system-ui,sans-serif;font-size:9px;padding:16px;}h2{font-size:14px;color:#185FA5;margin-bottom:12px;}table{border-collapse:collapse;width:100%;}th{background:#f0f0ee;border:1px solid #ddd;padding:4px 6px;font-size:8px;text-transform:uppercase;}td{border:1px solid #e8e7e0;padding:4px 6px;}@media print{body{padding:0;}}</style></head><body><h2>SISAV ADM — Registros de Campo</h2><p style="font-size:10px;color:#888;margin-bottom:10px;">Gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`);
      win.document.close();
    }
    function exportDailyXLSX() {
      const headers = ["Data","Agente","Imóveis Fechados","Imóveis Inspecionados","Depósitos Eliminados","Larvas Tratadas","Recuperados"];
      const rows = dailyFiltered.map(r=>[r.data,r.agente,r.fechados,r.inspecionados,r.eliminados,r.larvas,r.recuperados]);
      const ws = XLSX.utils.aoa_to_sheet([headers,...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,"Fechamento Diário");
      XLSX.writeFile(wb,'SISAV_Fechamento_Diario.xlsx');
    }
    function exportDailyPDF() {
      const win = window.open('','_blank');
      const headers = ["Data","Agente","Im. Fechados","Im. Inspecionados","Dep. Eliminados","Larvas Tratadas","Recuperados"];
      const rows = dailyFiltered.map(r=>[r.data,r.agente,r.fechados,r.inspecionados,r.eliminados,r.larvas,r.recuperados]);
      const trs = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
      win.document.write(`<!DOCTYPE html><html><head><title>SISAV - Fechamento Diário</title><style>body{font-family:system-ui,sans-serif;font-size:10px;padding:16px;}h2{font-size:14px;color:#185FA5;margin-bottom:12px;}table{border-collapse:collapse;width:100%;}th{background:#f0f0ee;border:1px solid #ddd;padding:5px 8px;font-size:9px;text-transform:uppercase;}td{border:1px solid #e8e7e0;padding:5px 8px;}@media print{body{padding:0;}}</style></head><body><h2>SISAV ADM — Fechamento Diário</h2><p style="font-size:10px;color:#888;margin-bottom:10px;">Gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`);
      win.document.close();
    }

    // INIT
    await renderWeekly();
    await carregarResumoArea();
    await carregarVisitas();
    await carregarKpis();
    dailyRender();

  })
