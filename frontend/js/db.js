// db.js
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.1/dist/dexie.mjs';

export const db = new Dexie("antivetorialDB");

db.version(1).stores({
  turnos: "data, municipio, ciclo, localidade, categoria_localidade, zona, atividade, agente",
  registros: "++id, data_turno",
  recuperacao: "++id, data_turno"
});
