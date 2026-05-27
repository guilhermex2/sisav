export type StatusFechado = "FECHADO" | "PENDENTE" | "RECUPERADO" | "RECUSADO"
export type ResultadoTentativa = "SEM_RESPOSTA" | "RECUSA" | "RECUPERADO"

export interface ImovelFechadoFiltros {
  status?:    StatusFechado
  agenteId?:  number
  turnoId?:   number
  municipio?: string
}

export interface TentativaBody {
  turnoId:    number
  agenteId:   number
  resultado:  ResultadoTentativa
  observacao?: string
}

export interface RecuperarBody {
  visitaRecuperacaoId?: number
}