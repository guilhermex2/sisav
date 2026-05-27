import { prisma } from "../libs/prisma"
import { Prisma } from "@prisma/client"
import {
  ImovelFechadoFiltros,
  TentativaBody,
  RecuperarBody,
} from "../types/imovelFechado"

type TX = Prisma.TransactionClient

// Tipos de imóvel que geram ImovelFechado automaticamente
const TIPOS_FECHADO = new Set(["R_F", "C_F", "TB_F", "PE_F", "O_F", "RECUSA"])

// 
//  Chamado dentro do salvarRegistro do syncController
//  Cria o ImovelFechado se ainda não existir para essa visita
// 
export async function criarSeNecessario(
  tx: TX,
  params: {
    tipoVisita:  string
    visitaId:    number
    imovelId:    number
    turnoId:     number
    agenteId:    number
    informacao?: string | null
  }
): Promise<void> {
  if (!TIPOS_FECHADO.has(params.tipoVisita)) return

  // Evita duplicata — uma visita só pode gerar um ImovelFechado
  const existe = await tx.imovelFechado.findUnique({
    where: { visitaOrigemId: params.visitaId },
  })
  if (existe) return

  // Mapeia o tipoVisita do enum de volta para a string legível
  const tipoMap: Record<string, string> = {
    R_F:    "R-F",
    C_F:    "C-F",
    TB_F:   "TB-F",
    PE_F:   "PE-F",
    O_F:    "O-F",
    RECUSA: "RECUSA",
  }

  await tx.imovelFechado.create({
    data: {
      imovelId:        params.imovelId,
      turnoId:         params.turnoId,
      agenteId:        params.agenteId,
      tipoImovel:      tipoMap[params.tipoVisita] ?? params.tipoVisita,
      visitaOrigemId:  params.visitaId,
      motivoFechamento: params.informacao ?? null,
      status:          "FECHADO",
    },
  })
}


//  Listagem com filtros

export async function listar(filtros: ImovelFechadoFiltros) {
  return prisma.imovelFechado.findMany({
    where: {
      ...(filtros.status   && { status:   filtros.status }),
      ...(filtros.agenteId && { agenteId: filtros.agenteId }),
      ...(filtros.turnoId  && { turnoId:  filtros.turnoId }),
      ...(filtros.municipio && {
        imovel: { municipio: filtros.municipio },
      }),
    },
    include: {
      imovel:    true,
      agente:    { select: { id: true, nome: true } },
      turno:     { select: { id: true, data: true, localidade: true } },
      tentativas: {
        orderBy: { criadoEm: "asc" },
      },
    },
    orderBy: { dataFechamento: "desc" },
  })
}


//  Registrar tentativa frustrada → avança status para PENDENTE

export async function registrarTentativa(
  id: number,
  body: TentativaBody
) {
  return prisma.$transaction(async (tx) => {
    const fechado = await tx.imovelFechado.findUnique({ where: { id } })
    if (!fechado) throw new Error("ImovelFechado não encontrado")
    if (fechado.status === "RECUPERADO" || fechado.status === "RECUSADO") {
      throw new Error(`Imóvel já está com status ${fechado.status}`)
    }

    await tx.tentativaRecuperacao.create({
      data: {
        imovelFechadoId: id,
        agenteId:        body.agenteId,
        turnoId:         body.turnoId,
        resultado:       body.resultado,
        observacao:      body.observacao ?? null,
      },
    })

    // RECUSA na tentativa → status RECUSADO, senão PENDENTE
    const novoStatus = body.resultado === "RECUSA" ? "RECUSADO" : "PENDENTE"

    return tx.imovelFechado.update({
      where: { id },
      data:  { status: novoStatus },
    })
  })
}


//  Marcar como recuperado

export async function recuperar(
  id: number,
  body: RecuperarBody
) {
  return prisma.$transaction(async (tx) => {
    const fechado = await tx.imovelFechado.findUnique({ where: { id } })
    if (!fechado) throw new Error("ImovelFechado não encontrado")
    if (fechado.status === "RECUPERADO") {
      throw new Error("Imóvel já foi recuperado")
    }

    return tx.imovelFechado.update({
      where: { id },
      data: {
        status:              "RECUPERADO",
        dataRecuperacao:     new Date(),
        visitaRecuperacaoId: body.visitaRecuperacaoId ?? null,
      },
    })
  })
}