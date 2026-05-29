import { Router } from 'express'
import * as TurnoController from '../controllers/turnoController'
import * as loginController from '../controllers/loginController'
import * as finalizarController from '../controllers/finalizarController'
import * as admController from '../controllers/admController'
import * as syncController from '../controllers/syncController'
import * as imovelFechadoController from '../controllers/imovelFechadoController'
import { autenticarToken } from "../middlewares/auth"

const mainRouter = Router()

//AGENTE
mainRouter.post('/sync/turno', autenticarToken, TurnoController.syncTurno) //CRIAR TURNO NO DB (FUNCIONANDO)
mainRouter.get('/sync/agente', TurnoController.buscarAgente) // VISUALIZAR AGENTES (FUNCIONANDO)
mainRouter.post('/sync/login', loginController.login) //login do agente (REVISAR ESSA PORRA!)
mainRouter.post('/api/turnos/finalizar', finalizarController.finalizarTurno) // Envia dados para o DB ao finalizar
mainRouter.patch("/sync/turnos/encerrar-automatico", autenticarToken, TurnoController.encerrarTurnoAutomatico);

// GET  /imoveis-fechados?status=FECHADO&agenteId=1&municipio=...
mainRouter.get("/imoveis-fechados", imovelFechadoController.listar)

// POST /imoveis-fechados/:id/tentativa
mainRouter.post("/imoveis-fechados/:id/tentativa", imovelFechadoController.registrarTentativa)

// PATCH /imoveis-fechados/:id/recuperar
mainRouter.patch("/imoveis-fechados/:id/recuperar", imovelFechadoController.recuperar)

//ADM
mainRouter.post('/sync/dados', autenticarToken, syncController.syncDados)
mainRouter.get('/sisav/adm', admController.getCampo)
mainRouter.get('/sisav/adm/kpis', admController.getKpis)
mainRouter.get('/sisav/adm/resumo-area', admController.getResumoArea)
mainRouter.get('/sisav/adm/desempenho-individual', admController.desempenhoSemanal)
mainRouter.patch('/sisav/adm/visita/:id', admController.editarVisita)

export default mainRouter