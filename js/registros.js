/**
 * @fileoverview Gerenciamento de registros de imóveis visitados
 * @module registros
 */

import { openDB } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  let db;

  // 🔹 Tenta abrir o banco e trata possíveis erros
  try {
    db = await openDB();
  } catch (err) {
    alert('Erro ao abrir o banco local');
    console.error(err);
    return;
  }

  /**
   * Busca o turno cadastrado para o dia atual
   * 
   * @param {IDBDatabase} db - Instância do banco de dados IndexedDB
   * @returns {Promise<Object|null>} Promise que resolve com os dados do turno ou null se não encontrado
   * 
   * @example
   * const turno = await getTurnoDoDia(db);
   * if (!turno) {
   *   console.log('Nenhum turno cadastrado hoje');
   * }
   */
  async function getTurnoDoDia(db) {
    const hoje = new Date().toISOString().split('T')[0];
    return new Promise((resolve) => {
      const tx = db.transaction('turnos', 'readonly');
      const store = tx.objectStore('turnos');
      const req = store.get(hoje);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  // 🔹 Verifica se há turno cadastrado para hoje
  const turno = await getTurnoDoDia(db);
  if (!turno) {
    alert('Cadastre o turno diário antes de registrar imóveis.');
    window.location.href = 'turno.html';
    return;
  }

  // ===========================================================
  // 🔸 Seleciona elementos da página
  // ===========================================================
  const tabela = document.querySelector('#tabela-registros tbody');

  /**
   * Salva um novo registro de imóvel no IndexedDB
   * 
   * Adiciona automaticamente a data do turno atual ao registro
   * 
   * @param {Object} dado - Dados do registro a ser salvo
   * @param {string} dado.quarteirao - Número do quarteirão
   * @param {string} dado.lado - Lado do quarteirão
   * @param {string} dado.logradouro - Nome da rua
   * @param {string} dado.numero - Número do imóvel
   * @param {string} dado.tipo_imovel - Tipo do imóvel
   * @param {string} dado.horario_entrada - Horário de entrada
   * @returns {Promise<void>} Promise que resolve quando o registro é salvo
   * @throws {Error} Rejeita se houver erro ao salvar
   */


  /**
   * Carrega e exibe todos os registros do turno atual na tabela
   * 
   * Busca registros usando o índice 'data' e renderiza as linhas da tabela
   * 
   * @returns {Promise<void>} Promise que resolve quando os registros são carregados e exibidos
   * @throws {Error} Rejeita se houver erro ao carregar os registros
   */
  async function carregarRegistros() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('registros', 'readonly');
      const store = tx.objectStore('registros');
      const index = store.index('data');
      const request = index.getAll(turno.data);

      request.onsuccess = () => {
        const lista = request.result;
        tabela.innerHTML = '';

        lista.forEach((d) => {
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
            <td>${d.a1 || ''}</td>
            <td>${d.a2 || ''}</td>
            <td>${d.b || ''}</td>
            <td>${d.c || ''}</td>
            <td>${d.d1 || ''}</td>
            <td>${d.d2 || ''}</td>
            <td>${d.e || ''}</td>
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

        resolve();
      };

      request.onerror = () => {
        console.error('Erro ao carregar registros:', request.error);
        reject(request.error);
      };
    });
  }

  // ===========================================================
  // 🔸 Inicialização: carrega registros existentes ao abrir a página
  // ===========================================================
  carregarRegistros();

  // 🔹 Captura erros não tratados de Promises
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Erro não tratado:', e.reason);
  });
});
