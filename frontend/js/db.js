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

// ✅ Nova versão com chave composta
db.version(3).stores({
  turnos: "[data+agenteId], finalizadoEm, municipio, ciclo, localidade, categoria_localidade, zona, atividade, agente, agenteId",
  registros: "++id, data_turno",
  recuperacao: "++id, data_turno"
});