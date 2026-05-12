import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { CampoDTO } from "../types/dto";
type VisitaComRelacoes = {
  id: number;
  tipoVisita: string;
  horarioEntrada: Date | null;
  informacao: string | null;

  a1: number | null;
  a2: number | null;
  b: number | null;
  c: number | null;
  d1: number | null;
  d2: number | null;
  e: number | null;

  inspL1: boolean | null;

  amostraInicial: number | null;
  amostraFinal: number | null;
  qtdDepTrat: number | null;
  depositosEliminados: number | null;
  qtdTubitos: number | null;
  quedaGramas: number | null;

  agente: {
    nome: string;
  };

  turno: {
    data: Date;
  };

  imovel: {
    quarteirao: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
  };
};

const prisma = new PrismaClient();

/*Essa função retorna todos os registros do banco
  Local de uso: Tabela Registros de Campo
*/
export const getCampo = async (req: Request, res: Response) => {
  try {

   const visitas = await prisma.visita.findMany({
        include: {
            agente: true,
            turno: true,
            imovel: true
        }
        }) as VisitaComRelacoes[];
    const dados: CampoDTO[] = visitas.map((v) => ({
      id: v.id,
      data: v.turno.data.toLocaleDateString("pt-BR"),
      quarteirao: v.imovel.quarteirao,
      lado: "-",
      logradouro: v.imovel.logradouro,
      num: v.imovel.numero,
      seq: v.id,
      compl: v.imovel.complemento || "—",
      tipo: v.tipoVisita,

      horario: v.horarioEntrada
        ? v.horarioEntrada.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
          })
        : "—",

      entrada: v.horarioEntrada ? "S" : "N",

      a1: v.a1,
      a2: v.a2,
      b: v.b,
      c: v.c,
      d1: v.d1,
      d2: v.d2,
      e: v.e,

      elim: v.depositosEliminados,
      insp: v.inspL1 ? 1 : 0,

      amostIni: v.amostraInicial,
      amostFin: v.amostraFinal,
      tubitos: v.qtdTubitos,
      queda: v.quedaGramas,
      depTrat: v.qtdDepTrat,

      info: v.informacao || "Normal",
      agente: v.agente.nome
    }));

    return res.json(dados);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno" });
  }
};

/*
  Função para os cards
*/
export const getKpis = async (req: Request, res: Response) => {
  try {

    const visitas = await prisma.visita.findMany({
      include: {
        imovel: true
      }
    });

    const totalRegistros = visitas.length;

    const totalImoveis = new Set(
      visitas.map(v => v.imovelId)
    ).size;

    const totalFechados = visitas.filter(v => v.tipoVisita === "R_F").length;

    return res.json({
      totalRegistros,
      totalImoveis,
      totalFechados
    });

  } catch (error) {
    console.error("Erro KPIs:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
};

//Função de Desempenho Individual
export const desempenhoSemanal = async (req: Request, res: Response) => {
  try {
    const { semana, ano } = req.query;

    const semanaNum = Number(semana) || getSemanaAtual().semana;
    const anoNum = Number(ano) || getSemanaAtual().ano;

    const { inicio, fim } = getIntervaloSemana(anoNum, semanaNum);

    const visitas = await prisma.visita.findMany({
      where: {
        turno: {
          data: {
            gte: inicio,
            lte: fim,
          },
        },
      },
      include: {
        agente: true,
      },
    });

    const mapa: Record<number, any> = {};

    visitas.forEach(v => {
      if (!mapa[v.agenteId]) {
        mapa[v.agenteId] = {
          agenteId: v.agenteId,
          nome: v.agente.nome,
          totalRegistros: 0,   // 🔥 PRINCIPAL KPI
          inspecionados: 0,
          fechados: 0,
          eliminados: 0,
          tratados: 0,
          recuperados: 0,
        };
      }

      const ag = mapa[v.agenteId];

      // 🔥 TOTAL DE REGISTROS (o que você quer pro ranking)
      ag.totalRegistros += 1;

      // mantém os outros dados
      ag.inspecionados += 1;

      if (v.tipoVisita === "NORMAL") ag.fechados += 1;
      if (v.tipoVisita === "RECUPERACAO") ag.recuperados += 1;

      ag.eliminados += v.depositosEliminados || 0;
      ag.tratados += v.qtdDepTrat || 0;
    });

    // 🔥 transforma em array
    let resultado = Object.values(mapa);

    // 🔥 ORDENA DO MAIOR PARA O MENOR (ranking)
    resultado = resultado.sort((a: any, b: any) => 
      b.totalRegistros - a.totalRegistros
    );

    res.json({
      semana: semanaNum,
      ano: anoNum,
      periodo: { inicio, fim },
      dados: resultado,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao buscar desempenho semanal" });
  }
};

//Funções de semana e intervalos
//Função de Resumo por area
// 🔹 helpers
function getSemanaAtual() {
  const hoje = new Date();

  const data = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  const diaSemana = data.getUTCDay() || 7;

  data.setUTCDate(data.getUTCDate() + 4 - diaSemana);

  const anoInicio = new Date(Date.UTC(data.getUTCFullYear(), 0, 1));
  const numeroSemana = Math.ceil((((data.getTime() - anoInicio.getTime()) / 86400000) + 1) / 7);

  return {
    semana: numeroSemana,
    ano: data.getUTCFullYear(),
  };
}

function getIntervaloSemana(ano: number, semana: number) {
  const simple = new Date(ano, 0, 1 + (semana - 1) * 7);
  const diaSemana = simple.getDay();

  const inicio = new Date(simple);

  if (diaSemana <= 4) {
    inicio.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    inicio.setDate(simple.getDate() + 8 - simple.getDay());
  }

  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim };
}

//  controller
export const getResumoArea = async (req: Request, res: Response) => {
  try {

    // 🔹 recebe semana/ano opcional
    const { semana, ano } = req.query;

    const semanaAtual = getSemanaAtual();

    const semanaNum = Number(semana) || semanaAtual.semana;
    const anoNum = Number(ano) || semanaAtual.ano;

    const { inicio, fim } = getIntervaloSemana(anoNum, semanaNum);

    // 🔥 AGORA FILTRADO POR SEMANA
    const visitas = await prisma.visita.findMany({
      where: {
        turno: {
          data: {
            gte: inicio,
            lte: fim,
          },
        },
      },
      include: {
        imovel: true,
      },
    });

    // 🔹 AGRUPAMENTO
    const mapa: Record<string, {
      rua: string;
      bairro: string;
      focos: number;
    }> = {};

    visitas.forEach((v) => {

      const rua = v.imovel?.logradouro || "—";
      const bairro = v.imovel?.localidade || "—";

      const chave = `${rua}-${bairro}`;

      const focos =
        (v.a1 || 0) +
        (v.a2 || 0) +
        (v.b || 0) +
        (v.c || 0) +
        (v.d1 || 0) +
        (v.d2 || 0) +
        (v.e || 0);

      if (!mapa[chave]) {
        mapa[chave] = {
          rua,
          bairro,
          focos: 0
        };
      }

      mapa[chave].focos += focos;
    });

    // 🔹 TOP 3
    const resultado = Object.values(mapa)
      .sort((a, b) => b.focos - a.focos)
      .slice(0, 3);

    return res.json({
      semana: semanaNum,
      ano: anoNum,
      periodo: { inicio, fim },
      dados: resultado,
    });

  } catch (error) {
    console.error("Erro no resumo por área:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
};


// recebe o id da Visita e atualiza os campos editáveis pelo coordenador.

// ── NOVA FUNÇÃO: editarVisita ─────────────────────────────────────────────────
export async function editarVisita(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ erro: 'ID inválido' })
  }

  // Campos permitidos para edição pelo coordenador.
  // Mapeamento: chave do body → campo no schema Prisma (model Visita)
  const {
    // Imovel (atualizado via update aninhado)
    quarteirao,
    logradouro,
    numero,
    complemento,

    // Visita direta
    tipoVisita,      // "NORMAL" | "R_F" | "C_F" | "RECUPERACAO"
    horarioEntrada,  // string ISO ou null
    informacao,

    // Depósitos por tipo
    a1, a2, b, c, d1, d2, e,

    // Larvicida / amostras
    inspL1,
    imTrat,
    amostraInicial,
    amostraFinal,
    qtdDepTrat,
    depositosEliminados,
    qtdTubitos,
    quedaGramas,
  } = req.body

  try {
    // Busca a visita com imovel para ter o imovelId
    const visita = await prisma.visita.findUnique({
      where: { id },
      include: { imovel: true },
    })

    if (!visita) {
      return res.status(404).json({ erro: 'Visita não encontrada' })
    }

    // ── 1. Atualiza campos do Imóvel (se fornecidos) ───────────────────────────
    const imovelUpdate: Record<string, unknown> = {}
    if (quarteirao  !== undefined) imovelUpdate.quarteirao  = quarteirao
    if (logradouro  !== undefined) imovelUpdate.logradouro  = logradouro
    if (numero      !== undefined) imovelUpdate.numero      = numero
    if (complemento !== undefined) imovelUpdate.complemento = complemento

    if (Object.keys(imovelUpdate).length > 0) {
      await prisma.imovel.update({
        where: { id: visita.imovelId },
        data: imovelUpdate,
      })
    }

    // ── 2. Atualiza campos da Visita ───────────────────────────────────────────
    const visitaUpdate: Record<string, unknown> = {}

    if (tipoVisita       !== undefined) visitaUpdate.tipoVisita       = tipoVisita
    if (horarioEntrada   !== undefined) visitaUpdate.horarioEntrada   = horarioEntrada ? new Date(horarioEntrada) : null
    if (informacao       !== undefined) visitaUpdate.informacao       = informacao

    if (a1 !== undefined) visitaUpdate.a1 = Number(a1)
    if (a2 !== undefined) visitaUpdate.a2 = Number(a2)
    if (b  !== undefined) visitaUpdate.b  = Number(b)
    if (c  !== undefined) visitaUpdate.c  = Number(c)
    if (d1 !== undefined) visitaUpdate.d1 = Number(d1)
    if (d2 !== undefined) visitaUpdate.d2 = Number(d2)
    if (e  !== undefined) visitaUpdate.e  = Number(e)

    if (inspL1             !== undefined) visitaUpdate.inspL1             = Boolean(inspL1)
    if (imTrat             !== undefined) visitaUpdate.imTrat             = Boolean(imTrat)
    if (amostraInicial     !== undefined) visitaUpdate.amostraInicial     = Number(amostraInicial)
    if (amostraFinal       !== undefined) visitaUpdate.amostraFinal       = Number(amostraFinal)
    if (qtdDepTrat         !== undefined) visitaUpdate.qtdDepTrat         = Number(qtdDepTrat)
    if (depositosEliminados!== undefined) visitaUpdate.depositosEliminados= Number(depositosEliminados)
    if (qtdTubitos         !== undefined) visitaUpdate.qtdTubitos         = Number(qtdTubitos)
    if (quedaGramas        !== undefined) visitaUpdate.quedaGramas        = Number(quedaGramas)

    const visitaAtualizada = await prisma.visita.update({
      where: { id },
      data: visitaUpdate,
      include: { imovel: true, agente: true, turno: true },
    })

    return res.json({ sucesso: true, visita: visitaAtualizada })

  } catch (err) {
    console.error('Erro ao editar visita:', err)
    return res.status(500).json({ erro: 'Erro interno ao atualizar visita' })
  }
}