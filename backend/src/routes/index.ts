import { Router } from 'express'
import * as TurnoController from '../controllers/turnoController'
import * as loginController from '../controllers/loginController'
import * as finalizarController from '../controllers/finalizarController'
import { autenticarToken } from "../middlewares/auth"

const mainRouter = Router()

mainRouter.post('/sync/turno', autenticarToken, TurnoController.syncTurno) //CRIAR TURNO NO DB (FUNCIONANDO)
mainRouter.get('/sync/agente', TurnoController.buscarAgente) // VISUALIZAR AGENTES (FUNCIONANDO)
mainRouter.post('/sync/login', loginController.login) //login do agente (REVISAR ESSA PORRA!)
mainRouter.post('/api/turnos/finalizar', finalizarController.finalizarTurno) // Envia dados para o DB ao finalizar


export default mainRouter