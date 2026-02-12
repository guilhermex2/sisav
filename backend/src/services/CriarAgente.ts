import { prisma } from "../libs/prisma"
import { Request, Response } from "express"

export const criarAgente = async(req: Request, res: Response) => {
    const agente = req.body

    /* 
    try{
        const agenteFinal = await prisma.agente.create({
            data:{
                id: 1,
                nome: agente,
                createdAt: 
            }
        })

        res.status(201).json(agenteFinal)
    } catch{
        res.status(400).json("Erro ao criar agente")
    }
        */
}