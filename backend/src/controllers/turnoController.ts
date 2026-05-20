// src/controllers/sync.controller.ts
import { prisma } from "../libs/prisma";
import { Request, Response } from "express";

export async function syncTurno(req: Request, res: Response) {

  // agenteId e nome vêm do token, não do body
  const agenteId = req.agente?.agenteId;
  const nomeAgente = req.agente?.nome;

  if (!agenteId || !nomeAgente) {
    return res.status(401).json({ erro: "Agente não autenticado" });
  }

  const {
    data,
    municipio,
    ciclo,
    localidade,
    categoria_localidade,
    zona,
    atividade,
    agente
  } = req.body;

  try {
    const turno = await prisma.turno.create({
      data: {
        data: new Date(data),
        municipio,
        ciclo,
        localidade,
        categoriaLocalidade: categoria_localidade,
        zona,
        atividade,
        nomeAgente: agente,        // snapshot do nome para relatórios
        agente: {
          connect: { id: agenteId }
        }
      }
    });

    res.json({ ok: true, turnoId: turno.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao salvar turno" });
  }
}

export const buscarAgente = async (req: Request, res: Response) => {
  try {
    const agentes = await prisma.agente.findMany({
      include:{
        turnos: true
        
      }
    });
    res.status(200).json(agentes);
  } catch (error) {
    res.status(400).json({ erro: "Erro ao buscar agente" });
  }
};

export async function encerrarTurnoAutomatico(req: Request, res: Response) {
  const agenteId = req.agente?.agenteId;

  if (!agenteId) {
    return res.status(401).json({ erro: "Agente não autenticado" });
  }

  const { data_turno, motivo } = req.body;

  if (!data_turno) {
    return res.status(400).json({ erro: "data_turno é obrigatório" });
  }

  try {
    const turno = await prisma.turno.findFirst({
      where: {
        agenteId,
        data:         new Date(data_turno),
        finalizadoEm: null,   // só encerra se ainda estiver aberto
      }
    });

    if (!turno) {
      return res.json({ ok: true, aviso: "Nenhum turno aberto encontrado para essa data" });
    }

    await prisma.turno.update({
      where: { id: turno.id },
      data: {
        finalizadoEm:             new Date(),
        encerradoAutomaticamente: true,
        motivoEncerramento:       motivo ?? "encerramento_automatico_sistema",
      }
    });

    res.json({ ok: true, turnoId: turno.id });

  } catch (error) {
    console.error("[encerrarTurnoAutomatico]", error);
    res.status(500).json({ erro: "Erro ao encerrar turno automaticamente" });
  }
}