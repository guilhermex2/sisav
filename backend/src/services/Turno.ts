
/*
import { Request, Response } from 'express';
import { prisma } from '../libs/prisma';

export const criarRegistros = async (req: Request, res: Response) => {
  const { turnoId, registros } = req.body;

  if (!turnoId || !Array.isArray(registros)) {
    return res.status(400).json({ message: 'Dados inválidos' });
  }

  try {
    const registrosCriados = await prisma.registro.createMany({
      data: registros.map(r => ({
        ...r,
        turnoId,
        data: new Date(r.data),
      })),
    });

    return res.status(201).json(registrosCriados);
  } catch (error) {
    console.error('Erro ao salvar registros:', error);
    return res.status(500).json({ message: 'Erro ao salvar registros' });
  }
};



export const buscarTurnoPorData = async (req: Request, res: Response) => {
  const data = req.params.data;

  try {
    const turno = await prisma.turno.findFirst({
      where: {
        data: new Date(),
      }
    });

    if (!turno) return res.status(404).json({ message: 'Turno não encontrado' });

    return res.status(200).json(turno);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar turno' });
  }
};
*/