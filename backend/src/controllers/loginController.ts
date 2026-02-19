// src/controllers/auth.controller.ts
import { prisma } from "../libs/prisma";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export async function login(req: Request, res: Response) {
  const { nome, senha } = req.body;

  console.log(req.body)
  const agente = await prisma.agente.findUnique({ where: { nome } });

  if (!agente || agente.password !== senha) { // usar bcrypt em produção
    return res.status(401).json({ erro: "Credenciais inválidas" });
  }

  const token = jwt.sign(
    { agenteId: agente.id, nome: agente.nome }, // payload
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  res.json({ token });
}
