// =================================================================
// src/controllers/syncController.ts - SISAV
// POST /sync/dados
// Sincronização automática dos dados salvos no IndexedDB do agente.
// Recebe registros em lote e persiste no banco via Prisma.
// =================================================================
import { Request, Response } from "express"
import { prisma } from "../libs/prisma"
import { PrismaClient } from "@prisma/client"

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

// -----------------------------------------------------------------
//  Tipos do payload recebido do SyncManager
// -----------------------------------------------------------------
interface ItemFila {
  _filaId: number
  tabela: "turnos" | "registros" | "recuperacao"
  dado: Record<string, unknown>
}

interface SyncBody {
  registros: ItemFila[]
}

// -----------------------------------------------------------------
//  Helpers (mesmos do finalizarController)
// -----------------------------------------------------------------
const toInt = (val: unknown): number | null => {
  const parsed = parseInt(String(val ?? ""), 10)
  return isNaN(parsed) ? null : parsed
}

const toBool = (val: unknown): boolean | null => {
  if (val === null || val === undefined) return null
  if (typeof val === "boolean") return val
  if (typeof val === "string") return val.toUpperCase() === "X" || val === "true"
  return null
}

// -----------------------------------------------------------------
//  Salvar turno no banco
// -----------------------------------------------------------------
async function salvarTurno(
  tx: TransactionClient,
  dado: Record<string, unknown>
): Promise<void> {
  const agenteId = Number(dado.agenteId)
  const data     = new Date(dado.data as string)

  // Evita duplicata — um turno por agente por data
  const existe = await tx.turno.findFirst({
    where: { agenteId, data },
  })

  if (existe) return

  await tx.turno.create({
    data: {
      data,
      municipio:           String(dado.municipio           ?? ""),
      ciclo:               String(dado.ciclo               ?? ""),
      localidade:          String(dado.localidade          ?? ""),
      categoriaLocalidade: dado.categoria_localidade ? String(dado.categoria_localidade) : null,
      zona:                dado.zona      ? String(dado.zona)      : null,
      atividade:           dado.atividade ? String(dado.atividade) : null,
      agenteId,
      nomeAgente:          String(dado.agente ?? dado.nomeAgente ?? ""),
    },
  })
}

// -----------------------------------------------------------------
//  Salvar registro de campo (visita) no banco
// -----------------------------------------------------------------
async function salvarRegistro(
  tx: TransactionClient,
  dado: Record<string, unknown>
): Promise<void> {
  const agenteId  = Number(dado.agenteId ?? 0)
  const dataTurno = String(dado.data_turno ?? "")

  // Busca o turno correspondente ao registro
  const turno = await tx.turno.findFirst({
    where: {
      agenteId,
      data: new Date(dataTurno),
    },
  })

  if (!turno) {
    // Turno ainda não chegou — será reprocessado no próximo sync
    throw new Error(`Turno não encontrado para agenteId=${agenteId} data=${dataTurno}`)
  }

  // Upsert do imóvel
  const codigoImovel = `${dado.quarteirao ?? ""}-${dado.numero ?? ""}-${dado.logradouro ?? ""}`.trim()

  await tx.imovel.upsert({
    where:  { codigo: codigoImovel },
    update: {},
    create: {
      codigo:      codigoImovel,
      municipio:   turno.municipio,
      localidade:  turno.localidade,
      quarteirao:  dado.quarteirao  ? String(dado.quarteirao)  : null,
      logradouro:  dado.logradouro  ? String(dado.logradouro)  : null,
      numero:      dado.numero      ? String(dado.numero)      : null,
      complemento: dado.complemento ? String(dado.complemento) : null,
    },
  })

  const imovel = await tx.imovel.findUnique({ where: { codigo: codigoImovel } })
  if (!imovel) throw new Error(`Imóvel não encontrado após upsert: ${codigoImovel}`)

  // Evita duplicata de visita
  const visitaExiste = await tx.visita.findFirst({
    where: { turnoId: turno.id, imovelId: imovel.id },
  })

  if (visitaExiste) return

  const tipoImovel  = String(dado.tipo_imovel ?? "R").toUpperCase().trim()
  const tipoVisita  = mapearTipoVisita(tipoImovel, Boolean(dado.is_recuperacao))

  await tx.visita.create({
    data: {
      turnoId:  turno.id,
      agenteId,
      imovelId: imovel.id,
      tipoVisita,
      horarioEntrada: dado.horario_entrada
        ? new Date(`${dataTurno}T${dado.horario_entrada}:00`)
        : null,
      informacao:          dado.informacao          ? String(dado.informacao) : null,
      a1:                  toInt(dado.a1),
      a2:                  toInt(dado.a2),
      b:                   toInt(dado.b),
      c:                   toInt(dado.c),
      d1:                  toInt(dado.d1),
      d2:                  toInt(dado.d2),
      e:                   toInt(dado.e),
      inspL1:              toBool(dado.insp_l1),
      imTrat:              toBool(dado.im_trat),
      amostraInicial:      toInt(dado.amostra_inicial),
      amostraFinal:        toInt(dado.amostra_final),
      qtdDepTrat:          toInt(dado.qtd_dep_trat),
      depositosEliminados: toInt(dado.depositos_eliminados),
      qtdTubitos:          toInt(dado.qtd_tubitos),
      quedaGramas:         toInt(dado.queda_gramas),
    },
  })
}

function mapearTipoVisita(
  tipoImovel: string,
  isRecuperacao: boolean
): "NORMAL" | "R_F" | "C_F" | "RECUPERACAO" {
  if (isRecuperacao) return "RECUPERACAO"
  switch (tipoImovel) {
    case "R-F": return "R_F"
    case "C-F": return "C_F"
    default:    return "NORMAL"
  }
}

// =================================================================
//  Controller principal
// =================================================================
export const syncDados = async (req: Request, res: Response): Promise<void> => {
  const { registros } = req.body as SyncBody

  if (!Array.isArray(registros) || registros.length === 0) {
    res.status(400).json({ erro: "Nenhum registro enviado." })
    return
  }

  const sincronizados: number[] = []
  const erros: { _filaId: number; motivo: string }[] = []

  for (const item of registros) {
    const { _filaId, tabela, dado } = item

    try {
      await prisma.$transaction(async (tx: TransactionClient) => {
        if (tabela === "turnos") {
          await salvarTurno(tx, dado)
        } else if (tabela === "registros" || tabela === "recuperacao") {
          await salvarRegistro(tx, dado)
        } else {
          throw new Error(`Tabela '${tabela}' não reconhecida.`)
        }
      })

      sincronizados.push(_filaId)

    } catch (err) {
      const error = err as Error
      console.error(`[Sync] Erro no item _filaId=${_filaId} tabela=${tabela}:`, error.message)
      erros.push({ _filaId, motivo: error.message })
    }
  }

  res.status(200).json({
    sincronizados,
    erros,
    total:       registros.length,
    confirmados: sincronizados.length,
    falhas:      erros.length,
  })
}