/**
 * @fileoverview Configuração e inicialização do IndexedDB para o sistema de controle antivetorial
 * @module db
 */

console.log("db.js loaded");

/**
 * Abre ou cria o banco de dados IndexedDB 'antivetorialDB'
 * 
 * Cria duas object stores:
 * - 'turnos': armazena turnos diários (keyPath: 'data')
 * - 'registros': armazena registros de imóveis com autoincremento (keyPath: 'id')
 * 
 * @returns {Promise<IDBDatabase>} Promise que resolve com a instância do banco de dados
 * @throws {Error} Rejeita se houver erro ao abrir o banco
 * 
 * @example
 * const db = await openDB();
 * console.log('Banco aberto:', db.name);
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('antivetorialDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Cria store de turnos (um por dia)
      if (!db.objectStoreNames.contains('turnos')) {
        const turnosStore = db.createObjectStore('turnos', { keyPath: 'data' });
      }

      // Cria store de registros
      if (!db.objectStoreNames.contains('registros')) {
        const registrosStore = db.createObjectStore('registros', { keyPath: 'id', autoIncrement: true });
        registrosStore.createIndex('data', 'data', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}
