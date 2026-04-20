// sync-manager.js
import { db } from "./db.js";

/**
 * SyncManager — sincronização automática via Dexie + API Node.js/Supabase
 *
 * Funciona com as três stores do projeto:
 *   - turnos      → chave composta [data+agenteId]
 *   - registros   → chave autoincrement ++id
 *   - recuperacao → chave autoincrement ++id
 *
 * Como usar em qualquer página:
 *   import { SyncManager } from "./sync-manager.js";
 *   const sync = new SyncManager({ apiUrl: "https://sua-api.com" });
 *   sync.init();
 */
export class SyncManager {
  /**
   * @param {object} config
   * @param {string}   config.apiUrl       - URL base do servidor Node.js
   * @param {string}   [config.endpoint]   - Rota de sync (padrão: /sync)
   * @param {number}   [config.intervalMs] - Intervalo periódico em ms (padrão: 60000)
   * @param {number}   [config.loteMaximo] - Registros por requisição (padrão: 50)
   * @param {Function} [config.onSyncOk]   - Callback após sync bem-sucedido
   * @param {Function} [config.onSyncErro] - Callback em caso de erro
   */
  constructor(config = {}) {
    this.apiUrl     = config.apiUrl     || "https://sisav-api.onrender.com";
    this.endpoint   = config.endpoint   || "/sync/dados";
    this.intervalMs = config.intervalMs || 60_000;
    this.loteMaximo = config.loteMaximo || 50;
    this.onSyncOk   = config.onSyncOk   || (() => {});
    this.onSyncErro = config.onSyncErro || ((err) => console.error("[SyncManager]", err));

    this._intervalo     = null;
    this._sincronizando = false;

    this._onOnline = () => {
      console.log("[SyncManager] Conexão detectada — sincronizando...");
      this._sincronizar();
    };
  }

  // ─────────────────────────────────────────────
  //  INICIALIZAÇÃO
  // ─────────────────────────────────────────────

  init() {
    if (navigator.onLine) this._sincronizar();

    window.addEventListener("online", this._onOnline);

    window.addEventListener("offline", () => {
      console.log("[SyncManager] Sem conexão — dados salvos na fila local.");
    });

    this._intervalo = setInterval(() => {
      if (navigator.onLine) this._sincronizar();
    }, this.intervalMs);

    console.log(`[SyncManager] Iniciado. Intervalo: ${this.intervalMs / 1000}s`);
  }

  destruir() {
    clearInterval(this._intervalo);
    window.removeEventListener("online", this._onOnline);
  }

  // ─────────────────────────────────────────────
  //  API PÚBLICA
  // ─────────────────────────────────────────────

  /**
   * Salva um TURNO no IndexedDB e enfileira para sync.
   * Usa put() porque turnos têm chave composta [data+agenteId].
   *
   * @param {object} turno - Objeto do turno (deve ter `data` e `agenteId`)
   */
  async salvarTurno(turno) {
    await db.turnos.put(turno);
    await this._enfileirar("turnos", turno);
    if (navigator.onLine) this._sincronizar();
  }

  /**
   * Salva um REGISTRO de campo no IndexedDB e enfileira para sync.
   *
   * @param {object} registro - Dados do formulário de campo
   * @returns {number} id gerado
   */
  async salvarRegistro(registro) {
    const id = await db.registros.add(registro);
    await this._enfileirar("registros", { ...registro, id });
    if (navigator.onLine) this._sincronizar();
    return id;
  }

  /**
   * Salva uma RECUPERAÇÃO no IndexedDB e enfileira para sync.
   *
   * @param {object} recuperacao - Dados da recuperação
   * @returns {number} id gerado
   */
  async salvarRecuperacao(recuperacao) {
    const id = await db.recuperacao.add(recuperacao);
    await this._enfileirar("recuperacao", { ...recuperacao, id });
    if (navigator.onLine) this._sincronizar();
    return id;
  }

  /**
   * Retorna a quantidade de registros ainda não sincronizados.
   * Use para exibir um badge/indicador na interface.
   *
   * @returns {number}
   */
  async contarPendentes() {
    return await db.sync_fila.where("synced").equals(0).count();
  }

  // ─────────────────────────────────────────────
  //  FILA INTERNA
  // ─────────────────────────────────────────────

  async _enfileirar(tabela, dado) {
    await db.sync_fila.add({
      tabela,
      dado,
      synced:   0,
      criadoEm: new Date().toISOString(),
    });
  }

  // ─────────────────────────────────────────────
  //  SINCRONIZAÇÃO
  // ─────────────────────────────────────────────

  async _sincronizar() {
    if (this._sincronizando) return;
    this._sincronizando = true;

    try {
      const pendentes = await db.sync_fila.where("synced").equals(0).toArray();

      if (pendentes.length === 0) {
        console.log("[SyncManager] Nenhum pendente.");
        return;
      }

      console.log(`[SyncManager] Enviando ${pendentes.length} registro(s)...`);

      for (let i = 0; i < pendentes.length; i += this.loteMaximo) {
        const lote = pendentes.slice(i, i + this.loteMaximo);
        await this._enviarLote(lote);
      }

    } catch (err) {
      this.onSyncErro(err);
    } finally {
      this._sincronizando = false;
    }
  }

  async _enviarLote(pendentes) {
    const payload = pendentes.map(({ id, tabela, dado }) => ({
      _filaId: id,
      tabela,
      dado,
    }));

    let resposta;
    try {
      resposta = await fetch(`${this.apiUrl}${this.endpoint}`, {
        method:  "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body:    JSON.stringify({ registros: payload }),
      });
    } catch (errRede) {
      console.warn("[SyncManager] Erro de rede:", errRede.message);
      throw errRede;
    }

    if (!resposta.ok) {
      const texto = await resposta.text();
      throw new Error(`API retornou ${resposta.status}: ${texto}`);
    }

    const resultado = await resposta.json();

    const idsOk = resultado.sincronizados || pendentes.map(p => p.id);
    await db.sync_fila.where("id").anyOf(idsOk).modify({ synced: 1 });

    console.log(`[SyncManager] ${idsOk.length} registro(s) confirmados.`);
    this.onSyncOk(idsOk);
  }
}