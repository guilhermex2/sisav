// db.js
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.1/dist/dexie.mjs';

export const db = new Dexie("antivetorialDB");

// Versão anterior - mantida para migration
db.version(2).stores({
  turnos: `
    data,
    finalizadoEm,
    municipio,
    ciclo,
    localidade,
    categoria_localidade,
    zona,
    atividade,
    agente
  `,
  registros: "++id, data_turno",
  recuperacao: "++id, data_turno"
});

// Versão com chave composta
db.version(3).stores({
  turnos: "[data+agenteId], finalizadoEm, municipio, ciclo, localidade, categoria_localidade, zona, atividade, agente, agenteId",
  registros: "++id, data_turno",
  recuperacao: "++id, data_turno"
});

//  Versão 4 — adiciona fila de sincronização (não altera stores existentes)
db.version(4).stores({
  turnos: "[data+agenteId], finalizadoEm, municipio, ciclo, localidade, categoria_localidade, zona, atividade, agente, agenteId",
  registros: "++id, data_turno",
  recuperacao: "++id, data_turno",
  sync_fila: "++id, tabela, synced, criadoEm"
});