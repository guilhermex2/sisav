// src/types/dto.ts

export interface CampoDTO {
  data: string;
  quarteirao: string | null;
  lado: string;
  logradouro: string | null;
  num: string | null;
  seq: number;
  compl: string;
  tipo: string;
  horario: string;
  entrada: "S" | "N";

  a1?: number | null;
  a2?: number | null;
  b?: number | null;
  c?: number | null;
  d1?: number | null;
  d2?: number | null;
  e?: number | null;

  elim?: number | null;
  insp?: number;

  amostIni?: number | null;
  amostFin?: number | null;
  tubitos?: number | null;
  queda?: number | null;
  depTrat?: number | null;

  info: string;
  agente: string;
}

export interface FechamentoDiarioDTO {
  data: string;
  agente: string;
  fechados: number;
  inspecionados: number;
  eliminados: number;
  larvas: number;
  recuperados: number;
}