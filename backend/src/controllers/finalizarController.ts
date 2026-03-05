// =================================================================
// src/controllers/turnoController.ts - SISAV
// POST /api/turnos/finalizar
// =================================================================
import { Request, Response } from "express";
import { prisma } from "../libs/prisma";
import { PrismaClient } from "@prisma/client";

// Tipo correto para o cliente de transação do Prisma
type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// -----------------------------------------------------------------
// 📦 Tipos do payload (espelham o schema Prisma)
// -----------------------------------------------------------------
interface TurnoPayload {
  data: string;
  municipio: string;
  ciclo: string;
  localidade: string;
  categoriaLocalidade?: string;
  zona?: string;
  atividade?: string;
  agenteId: number;
  nomeAgente: string;
}

interface RegistroPayload {
  quarteirao?: string;
  sequencia?: string;
  sequencia2?: string;
  lado?: string;
  tipoImovel?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  horarioEntrada?: string;
  informacao?: string;
  a1?: number | string | null;
  a2?: number | string | null;
  b?: number | string | null;
  c?: number | string | null;
  d1?: number | string | null;
  d2?: number | string | null;
  e?: number | string | null;
  inspL1?: boolean | null;
  imTrat?: boolean | null;
  amostraInicial?: number | string | null;
  amostraFinal?: number | string | null;
  qtdDepTrat?: number | string | null;
  depositosEliminados?: number | string | null;
  qtdTubitos?: number | string | null;
  quedaGramas?: number | string | null;
}

interface FinalizarTurnoBody {
  turno: TurnoPayload;
  registros: RegistroPayload[];
}

// -----------------------------------------------------------------
// 🔢 Helpers de conversão segura
// -----------------------------------------------------------------
const toInt = (val: unknown): number | null => {
  const parsed = parseInt(String(val ?? ""), 10);
  return isNaN(parsed) ? null : parsed;
};

const toBool = (val: unknown): boolean | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toUpperCase() === "X" || val === "true";
  return null;
};

function definirTipoVisita(r: RegistroPayload): "NORMAL" | "R_F" | "C_F" | "RECUPERACAO" {
  if (r.tipoImovel === "R-F") return "R_F";
  if (r.tipoImovel === "C-F") return "C_F";
  if (r.tipoImovel === "RECUPERACAO") return "RECUPERACAO";
  return "NORMAL";
}

// =================================================================
// 📥 Controller: Finalizar turno
// =================================================================
export async function finalizarTurno(
  req: Request,
  res: Response
): Promise<Response> {
  const body = req.body as Partial<FinalizarTurnoBody>;
  const { turno, registros } = body;

  // -----------------------------------------------------------------
  // 🔎 Validação do payload
  // -----------------------------------------------------------------
  if (!turno || !Array.isArray(registros)) {
    return res.status(400).json({
      message: "Payload inválido. Verifique os campos: turno e registros.",
    });
  }

  if (
    !turno.data ||
    !turno.municipio ||
    !turno.ciclo ||
    !turno.localidade ||
    !turno.agenteId ||
    !turno.nomeAgente
  ) {
    return res.status(400).json({
      message:
        "Campos obrigatórios ausentes no turno: data, municipio, ciclo, localidade, agenteId, nomeAgente.",
    });
  }

  try {
    const resultado = await prisma.$transaction(async (tx: TransactionClient) => {

      // 1️⃣ Criar o turno
      const turnoSalvo = await tx.turno.create({
        data: {
          data:                new Date(turno.data),
          municipio:           turno.municipio,
          ciclo:               turno.ciclo,
          localidade:          turno.localidade,
          categoriaLocalidade: turno.categoriaLocalidade ?? null,
          zona:                turno.zona                ?? null,
          atividade:           turno.atividade           ?? null,
          agenteId:            Number(turno.agenteId),
          nomeAgente:          turno.nomeAgente,
        },
      });

      // 2️⃣ Criar visitas vinculadas ao turno
      for (const r of registros) {

        // 🔹 1. Definir um código único do imóvel
        const codigoImovel = `${r.quarteirao ?? ""}-${r.numero ?? ""}-${r.logradouro ?? ""}`.trim();

        // 🔹 2. Criar ou buscar imóvel
        const imovel = await tx.imovel.upsert({
          where: { codigo: codigoImovel },
          update: {},
          create: {
            codigo:      codigoImovel,
            municipio:   turno.municipio,
            localidade:  turno.localidade,
            quarteirao:  r.quarteirao  ?? null,
            logradouro:  r.logradouro  ?? null,
            numero:      r.numero      ?? null,
            complemento: r.complemento ?? null,
          },
        });

        // 🔹 3. Criar visita
        await tx.visita.create({
          data: {
            turnoId:  turnoSalvo.id,
            agenteId: Number(turno.agenteId),
            imovelId: imovel.id,

            tipoVisita: definirTipoVisita(r),

            horarioEntrada: r.horarioEntrada
              ? new Date(`${turno.data.split("T")[0]}T${r.horarioEntrada}:00`)
              : null,

            informacao: r.informacao ?? null,

            a1: toInt(r.a1),
            a2: toInt(r.a2),
            b:  toInt(r.b),
            c:  toInt(r.c),
            d1: toInt(r.d1),
            d2: toInt(r.d2),
            e:  toInt(r.e),

            inspL1: toBool(r.inspL1),
            imTrat: toBool(r.imTrat),

            amostraInicial:      toInt(r.amostraInicial),
            amostraFinal:        toInt(r.amostraFinal),
            qtdDepTrat:          toInt(r.qtdDepTrat),
            depositosEliminados: toInt(r.depositosEliminados),
            qtdTubitos:          toInt(r.qtdTubitos),
            quedaGramas:         toInt(r.quedaGramas),
          },
        });
      }

      return turnoSalvo;
    });

    return res.status(201).json({
      message:        "Turno finalizado e sincronizado com sucesso.",
      turnoId:        resultado.id,
      totalRegistros: registros.length,
    });

  } catch (err) {
    const error = err as Error;
    console.error("❌ Erro ao finalizar turno:", error.message);

    return res.status(500).json({
      message: "Erro interno ao salvar turno no banco de dados.",
      detalhe: error.message,
    });
  }
}