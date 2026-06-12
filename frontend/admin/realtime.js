// realtime.js
function iniciarRealtimeGlobal({ onVisita, onImovelFechado, onImovel }) {
  window.supabase
    .channel("db-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "Visita" },
      (payload) => {
        console.log("🔴 Evento Visita:", payload);
        if (payload.eventType === "INSERT" && onVisita?.onInsert) onVisita.onInsert(payload.new);
        if (payload.eventType === "UPDATE" && onVisita?.onUpdate) onVisita.onUpdate(payload.new);
        if (payload.eventType === "DELETE" && onVisita?.onDelete) onVisita.onDelete(payload.old);
      }
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "ImovelFechado" },
      (payload) => {
        console.log("🔴 Evento ImovelFechado:", payload);
        if (payload.eventType === "INSERT" && onImovelFechado?.onInsert) onImovelFechado.onInsert(payload.new);
        if (payload.eventType === "UPDATE" && onImovelFechado?.onUpdate) onImovelFechado.onUpdate(payload.new);
      }
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "Imovel" },
      (payload) => {
        console.log("🔴 Evento Imovel:", payload);
        if (payload.eventType === "INSERT" && onImovel?.onInsert) onImovel.onInsert(payload.new);
      }
    )
    .subscribe((status, err) => {
      console.log("Realtime status:", status);
      if (err) console.error("Realtime erro:", err);
    });
}