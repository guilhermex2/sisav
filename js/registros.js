document.addEventListener('DOMContentLoaded', () => {
  const turno = JSON.parse(localStorage.getItem('turnoDiario'));
  if (!turno) {
    alert('Cadastre o turno diário antes de registrar imóveis.');
    window.location.href = 'turno.html';
    return;
  }

  const form = document.getElementById('registroForm');
  const tabela = document.querySelector('#tabela-registros tbody');

  function salvarNoLocalStorage(dado) {
    const lista = JSON.parse(localStorage.getItem('registros') || '[]');
    dado.data = turno.data;
    dado.tipo_imovel = dado.tipo_imovel || '-';
    dado.atividade = turno.atividade || '-';
    lista.push(dado);
    localStorage.setItem('registros', JSON.stringify(lista));
  }

  function carregarRegistros() {
    const lista = JSON.parse(localStorage.getItem('registros') || '[]');
    tabela.innerHTML = '';
    lista.filter(r => r.data === turno.data).forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.data}</td>
        <td>${d.quarteirao || ''}</td>
        <td>${d.lado || ''}</td>
        <td>${d.logradouro || ''}</td>
        <td>${d.numero || ''}</td>
        <td>${d.sequencia || d.sequencia2 || ''}</td>
        <td>${d.complemento || ''}</td>
        <td>${d.tipo_imovel || ''}</td>
        <td>${d.horario_entrada || ''}</td>
        <td>${d.a1}</td>
        <td>${d.a2}</td>
        <td>${d.b}</td>
        <td>${d.c}</td>
        <td>${d.d1}</td>
        <td>${d.d2}</td>
        <td>${d.e}</td>
        <td>${d.depositos_eliminados}</td>
        <td>${d.insp_l1 || ''}</td>
        <td>${d.amostra_inicial || ''}</td>
        <td>${d.amostra_final || ''}</td>
        <td>${d.qtd_tubitos || ''}</td>
        <td>${d.im_trat || ''}</td>
        <td>${d.queda_gramas || ''}</td>
        <td>${d.qtd_dep_trat || ''}</td>
        <td>${d.informacao || ''}</td>
      `;
      tabela.appendChild(tr);
    });
  }

  async function sincronizarTurno() {
    const turnoSalvo = JSON.parse(localStorage.getItem('turnoDiario'));
    const turnoEnviado = localStorage.getItem('turnoEnviado');

    if (turnoEnviado && localStorage.getItem('turnoId')) return;

    turnoSalvo.ciclo = parseInt(turnoSalvo.ciclo);

    try {
      const response = await fetch('http://localhost:4000/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnoSalvo)
      });

      if (response.status === 201) {
        const turnoCriado = await response.json();
        localStorage.setItem('turnoId', turnoCriado.id);
        localStorage.setItem('turnoEnviado', 'true');
        console.log('Turno criado e salvo com sucesso.');
      } else if (response.status === 409) {
        // Turno já existe, buscar pelo dia
        const res = await fetch(`http://localhost:4000/turno/${turnoSalvo.data}`);
        const turnoExistente = await res.json();
        localStorage.setItem('turnoId', turnoExistente.id);
        localStorage.setItem('turnoEnviado', 'true');
        console.log('Turno já existia, sincronizado com sucesso.');
      }

    } catch (error) {
      console.error('Erro ao sincronizar turno:', error);
    }
  }

  async function enviarDadosParaServidor() {
    const registros = JSON.parse(localStorage.getItem('registros') || '[]');
    const turnoId = localStorage.getItem('turnoId');
    const turno = JSON.parse(localStorage.getItem('turnoDiario'));

    if (!turnoId || registros.length === 0) return;

    const registrosDoDia = registros.filter(r => r.data === turno.data);

    if (registrosDoDia.length === 0) return;

    try {
      await fetch(`http://localhost:4000/registro/${turnoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrosDoDia)
      });

      console.log('Registros enviados com sucesso.');
    } catch (error) {
      console.error('Erro ao enviar registros:', error);
    }
  }

  // Primeira sincronização ao carregar a página
  sincronizarTurno();
  if (navigator.onLine) {
    enviarDadosParaServidor();
  }

  // Sincronização automática quando voltar a internet
  window.addEventListener('online', () => {
    sincronizarTurno();
    enviarDadosParaServidor();
  });

  // Formulário de novo registro
  form.addEventListener('submit', e => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form).entries());
    salvarNoLocalStorage(dados);
    carregarRegistros();

    if (navigator.onLine) {
      enviarDadosParaServidor();
    }

    form.reset();
  });

  carregarRegistros();
});
