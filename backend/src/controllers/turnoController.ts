// src/controllers/sync.controller.ts
import { prisma } from "../libs/prisma";
import { Request, Response } from "express"


/*
Função para salvar turno no DB...
Essa funão já funciona, fazendo referencia ao agente pelo agente id...
Precisa ser ajustada para buscar o agenteId de uma forma melhor
*/
export async function syncTurno(req: Request, res: Response) {
  const {
    data,
    municipio,
    ciclo,
    localidade,
    categoria_localidade,
    zona,
    atividade,
    agenteId
  } = req.body;

  try {
    const turno = await prisma.turno.create({
      data: {
        data: new Date(data),
        municipio: municipio,
        ciclo: ciclo,
        localidade: localidade,
        categoriaLocalidade: categoria_localidade,
        zona: zona,
        atividade: atividade,
        agente: {
          connect: {
            id: agenteId
          }
        }
      }
    });

    res.json({ ok: true, turnoId: turno.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao salvar turno" });
  }
}

//Função de buscar agente utiizada para testes
export const buscarAgente = async(req: Request, res: Response) => {
  try {
    const agente = await prisma.agente.findMany()
    res.status(200).json(agente)
  } catch (error) {
    res.status(400).json("erro: erro ao buscar agente")
  }
}