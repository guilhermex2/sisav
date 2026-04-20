// controllers/syncController.ts
import { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Tabelas permitidas — adicione conforme necessário
const TABELAS_PERMITIDAS = new Set<string>([
  'turnos',
  'registros',
  'recuperacao',
])

interface ItemFila {
  _filaId: number
  tabela: string
  dado: Record<string, unknown>
}

interface SyncBody {
  registros: ItemFila[]
}

export const syncDados = async (req: Request, res: Response): Promise<void> => {
  const { registros } = req.body as SyncBody

  if (!Array.isArray(registros) || registros.length === 0) {
    res.status(400).json({ erro: 'Nenhum registro enviado.' })
    return
  }

  const sincronizados: number[] = []
  const erros: { _filaId: number; motivo: string }[] = []

  // Agrupa por tabela para fazer upsert em lote
  const porTabela = new Map<string, ItemFila[]>()

  for (const item of registros) {
    const { _filaId, tabela, dado } = item

    if (!TABELAS_PERMITIDAS.has(tabela)) {
      erros.push({ _filaId, motivo: `Tabela '${tabela}' não permitida.` })
      continue
    }

    if (!porTabela.has(tabela)) porTabela.set(tabela, [])
    porTabela.get(tabela)!.push(item)
  }

  // Persiste no Supabase tabela a tabela
  for (const [tabela, itens] of porTabela.entries()) {
    // Remove campos de controle do SyncManager antes de salvar
    const linhas = itens.map(({ dado }) => {
      const { _tabela, _synced, _syncAt, _createdAt, ...dadoLimpo } = dado as any
      return dadoLimpo
    })

    const { error } = await supabase
      .from(tabela)
      .upsert(linhas, { onConflict: 'id', ignoreDuplicates: false })

    if (error) {
      console.error(`[Sync] Erro ao upsert em '${tabela}':`, error.message)
      itens.forEach(({ _filaId }) => erros.push({ _filaId, motivo: error.message }))
    } else {
      itens.forEach(({ _filaId }) => sincronizados.push(_filaId))
    }
  }

  res.status(200).json({
    sincronizados,
    erros,
    total:       registros.length,
    confirmados: sincronizados.length,
    falhas:      erros.length,
  })
}