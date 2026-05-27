import { Request, Response } from "express"
import * as service from "../services/imovelFechadoService"
import { ImovelFechadoFiltros } from "../types/imovelFechado"

export const listar = async (req: Request, res: Response): Promise<void> => {
  try {
    const filtros: ImovelFechadoFiltros = {
      status:    req.query.status   as ImovelFechadoFiltros["status"],
      agenteId:  req.query.agenteId ? Number(req.query.agenteId) : undefined,
      turnoId:   req.query.turnoId  ? Number(req.query.turnoId)  : undefined,
      municipio: req.query.municipio as string | undefined,
    }

    const dados = await service.listar(filtros)
    res.status(200).json(dados)
  } catch (err) {
    const error = err as Error
    res.status(500).json({ erro: error.message })
  }
}

export const registrarTentativa = async (req: Request, res: Response): Promise<void> => {
  try {
    const id      = Number(req.params.id)
    const updated = await service.registrarTentativa(id, req.body)
    res.status(200).json(updated)
  } catch (err) {
    const error = err as Error
    const status = error.message.includes("não encontrado") ? 404 : 400
    res.status(status).json({ erro: error.message })
  }
}

export const recuperar = async (req: Request, res: Response): Promise<void> => {
  try {
    const id      = Number(req.params.id)
    const updated = await service.recuperar(id, req.body)
    res.status(200).json(updated)
  } catch (err) {
    const error = err as Error
    const status = error.message.includes("não encontrado") ? 404 : 400
    res.status(status).json({ erro: error.message })
  }
}