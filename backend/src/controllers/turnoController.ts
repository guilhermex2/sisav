import { Request, Response } from 'express';
import { prisma } from '../libs/prisma';

const formatRegistro = (registro: any) => {
  return {
    quarteirao: registro.quarteirao || "1",
    sequencia: registro.sequencia || "10/1",
    lado: registro.lado || "2",
    logradouro: registro.logradouro || "Logradouro Teste 2",
    numero: registro.numero || "4",
    sequencia2: registro.sequencia2 || "24-1",
    complemento: registro.complemento || "Nada",
    tipo_imovel: registro.tipo_imovel || "TB",
    horario_entrada: registro.horario_entrada || "18:33",
    a1: parseInt(registro.a1, 10) || 0,
    a2: parseInt(registro.a2, 10) || 0,
    b: parseInt(registro.b, 10) || 0,
    c: parseInt(registro.c, 10) || 0,
    d1: parseInt(registro.d1, 10) || 0,
    d2: parseInt(registro.d2, 10) || 0,
    e: parseInt(registro.e, 10) || 0,
    depositos_eliminados: parseInt(registro.depositos_eliminados, 10) || 0,
    insp_l1: registro.insp_l1 === 'X' ? 1 : parseInt(registro.insp_l1, 10) || 0,
    amostra_inicial: parseInt(registro.amostra_inicial, 10) || 0,
    amostra_final: parseInt(registro.amostra_final, 10) || 0,
    qtd_tubitos: parseInt(registro.qtd_tubitos, 10) || 0,
    im_trat: registro.im_trat === 'X' ? 1 : parseInt(registro.im_trat, 10) || 0,
    queda_gramas: parseInt(registro.queda_gramas, 10) || 0,
    qtd_dep_trat: parseInt(registro.qtd_dep_trat, 10) || 0,
    informacao: registro.informacao || "nada a informar hoje",
    data: new Date(registro.data),
    atividade: registro.atividade || "1-RA",
    turnoId: registro.turnoId, // obrigatório
  };
};

// Controller para criar vários registros
export const criarRegistros = async (req: Request, res: Response) => {
  try {
    const registro = await prisma.registro.create({
      data: {
          quarteirao: "2",             
          sequencia: "10/1",               
          lado: "3",                    
          logradouro: "Teste dia 2",              
          numero: "5",                  
          sequencia2: "24-1",              
          complemento: "Nada 2",             
          tipo_imovel: "TB",             
          horario_entrada: "09:40",         
          a1: 1,                         
          a2: 3,                         
          b: 2,                          
          c: 0,                          
          d1: 1,                         
          d2: 1,                         
          e: 0,                          
          depositos_eliminados: 0,       
          insp_l1: 0,                    
          amostra_inicial: 0,            
          amostra_final: 0,              
          qtd_tubitos: 0,                
          im_trat: 0,                    
          queda_gramas: 0,               
          qtd_dep_trat: 0,               
          informacao: "nada a informar hoje",
          data: new Date("2025-08-05"),
          atividade: "1-RA",
          turnoId: "2499e3ed-b1b0-4312-9630-5bb951414c7d"
      }
    });

    res.status(201).json(registro);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar registro' });
  }
};

export const criarUsuario = async (req: Request, res: Response) => {
  const {nome} = req.body;
  try {
    const usuario = await prisma.usuario.create({
      data: {
        nome,
      }
    });
    return res.status(201).json(usuario);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro ao criar usuário' });
  }
};

export const criarTurno = async (req: Request, res: Response) => {
  const { usuarioId } = req.params;
  const dados = req.body;

  try {
    const turno = await prisma.turno.create({
      data: {
        ...dados,
        data: new Date(dados.data),
        usuarioId,
      }
    });
    res.status(201).json(turno);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar turno' });
  }
};

export const buscarTurnoPorData = async (req: Request, res: Response) => {
  const data = req.params.data;

  try {
    const turno = await prisma.turno.findFirst({
      where: {
        data: new Date(data),
      }
    });

    if (!turno) return res.status(404).json({ message: 'Turno não encontrado' });

    return res.status(200).json(turno);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar turno' });
  }
};
