import { prisma } from "../libs/prisma";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export async function login(req: Request, res: Response) {
  const { nome, senha } = req.body;

  const agente = await prisma.agente.findUnique({
    where: { nome }
  });

  if (!agente || agente.password !== senha) {
    return res.status(401).json({ erro: "Credenciais inválidas" });
  }

  const token = jwt.sign(
    {
      agenteId: agente.id,
      nome: agente.nome,
      role: agente.role // 🔥 aqui está a mudança importante
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  res.json({
    token,
    usuario: {
      id: agente.id,
      nome: agente.nome,
      role: agente.role
    }
  });
}