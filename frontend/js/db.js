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

// Versão 4 — adiciona fila de sincronização
db.version(4).stores({
  turnos: "[data+agenteId], finalizadoEm, municipio, ciclo, localidade, categoria_localidade, zona, atividade, agente, agenteId",
  registros: "++id, data_turno",
  recuperacao: "++id, data_turno",
  sync_fila: "++id, tabela, synced, criadoEm"
});

// Versão 5 — adiciona store de PDFs finalizados (Blob)
// historico_pdfs guarda o PDF gerado no momento da finalização do turno.
// Os dados de registros/turno são limpos após a finalização; o PDF persiste aqui.
db.version(5).stores({
  turnos: "[data+agenteId], finalizadoEm, municipio, ciclo, localidade, categoria_localidade, zona, atividade, agente, agenteId",
  registros: "++id, data_turno",
  recuperacao: "++id, data_turno",
  sync_fila: "++id, tabela, synced, criadoEm",
  // chave: [data+agenteId] espelha a chave do turno para fácil lookup
  historico_pdfs: "[data+agenteId], data, agenteId, criadoEm"
});