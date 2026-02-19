// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface TokenPayload {
  agenteId: number;
  nome: string;
}

// Extende o Request do Express para incluir os dados do agente
declare global {
  namespace Express {
    interface Request {
      agente?: TokenPayload;
    }
  }
}

export function autenticarToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ erro: "Token não fornecido" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    req.agente = payload;
    next();
  } catch {
    return res.status(403).json({ erro: "Token inválido ou expirado" });
  }
}