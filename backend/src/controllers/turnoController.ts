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
    const agentes = await prisma.agente.findMany();
    res.status(200).json(agentes);
  } catch (error) {
    res.status(400).json({ erro: "Erro ao buscar agente" });
  }
};