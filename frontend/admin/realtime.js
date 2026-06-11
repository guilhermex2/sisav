function iniciarRealtime({ tabela, onInsert, onUpdate, onDelete }) {
  const channel = window.supabase
    .channel("db-changes") // canal único para todas as tabelas
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: tabela },
      (payload) => {
        console.log(`🔴 Evento [${tabela}]:`, payload);
        if (payload.eventType === "INSERT" && onInsert) onInsert(payload.new);
        if (payload.eventType === "UPDATE" && onUpdate) onUpdate(payload.new);
        if (payload.eventType === "DELETE" && onDelete) onDelete(payload.old);
      }
    )
    .subscribe((status, err) => {
      console.log(`Realtime [${tabela}]: ${status}`);
      if (err) console.error(`Erro Realtime [${tabela}]:`, err); // ← mostra erro se houver
    });

  return channel;
}