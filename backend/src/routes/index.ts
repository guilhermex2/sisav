import { Router } from 'express'
import * as TurnoController from '../controllers/turnoController'

const mainRouter = Router()

mainRouter.post('/sync/turno', TurnoController.syncTurno) //Enviar o turno para o DB
mainRouter.get('/sync/agente', TurnoController.buscarAgente) //Visualizar turno salvo (testes)


export default mainRouter