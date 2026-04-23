// =================================================================
// src/controllers/finalizarController.ts - SISAV
// POST /api/turnos/finalizar
//
// Com o sync automático ativo, turno e visitas já estão no banco.
// Este controller apenas localiza o turno e marca finalizadoEm.
// =================================================================
import { Request, Response } from "express"
import { prisma } from "../libs/prisma"

interface FinalizarBody {
  agenteId: number
  data: string // "2026-04-21"
}

export async function finalizarTurno(
  req: Request,
  res: Response
): Promise<Response> {
  const { agenteId, data } = req.body as Partial<FinalizarBody>

  if (!agenteId || !data) {
    return res.status(400).json({
      message: "Campos obrigatórios ausentes: agenteId, data.",
    })
  }

  const dataStr = String(data).split("T")[0]

  try {
    // Busca o turno que o sync automático já criou
    const turno = await prisma.turno.findFirst({
      where: {
        agenteId: Number(agenteId),
        data: {
          gte: new Date(`${dataStr}T00:00:00.000Z`),
          lt:  new Date(`${dataStr}T23:59:59.999Z`),
        },
      },
    })

    if (!turno) {
      return res.status(404).json({
        message: "Turno não encontrado. Verifique se o sync automático está funcionando.",
      })
    }

    if (turno.finalizadoEm) {
      return res.status(409).json({
        message: "Este turno já foi finalizado.",
        finalizadoEm: turno.finalizadoEm,
      })
    }

    // Apenas marca como finalizado
    const turnoFinalizado = await prisma.turno.update({
      where: { id: turno.id },
      data:  { finalizadoEm: new Date() },
    })

    const totalVisitas = await prisma.visita.count({
      where: { turnoId: turno.id },
    })

    return res.status(200).json({
      message:        "Turno finalizado com sucesso.",
      turnoId:        turnoFinalizado.id,
      finalizadoEm:   turnoFinalizado.finalizadoEm,
      totalRegistros: totalVisitas,
    })

  } catch (err) {
    const error = err as Error
    console.error("❌ Erro ao finalizar turno:", error.message)
    return res.status(500).json({
      message: "Erro interno ao finalizar turno.",
      detalhe: error.message,
    })
  }
}