/**
 * @fileoverview Gerenciamento de turnos diários de trabalho
 * @module turno
 * 
 * Este módulo permite:
 * - Cadastrar turno diário (zona, bairro, setor, etc)
 * - Verificar se já existe turno cadastrado para o dia
 * - Redirecionar automaticamente se turno já estiver cadastrado
 */

import { openDB } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const db = await openDB();
  const form = document.getElementById('form-turno');
  const hoje = new Date().toISOString().split('T')[0];

  // Verifica se já existe turno salvo para o dia
  const tx = db.transaction('turnos', 'readonly');
  const store = tx.objectStore('turnos');
  const request = store.get(hoje);

  request.onsuccess = (event) => {
    if (event.target.result) {
      window.location.href = 'index.html';
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());
    dados.data = dados.data || hoje;

    const tx = db.transaction('turnos', 'readwrite');
    const store = tx.objectStore('turnos');
    await store.put(dados);

    window.location.href = 'index.html';
  });
});
