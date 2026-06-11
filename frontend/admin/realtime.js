function iniciarRealtime({ tabela, onInsert, onUpdate, onDelete }) {
  const channel = supabase
    .channel(`realtime-${tabela}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: tabela },
      (payload) => {
        if (payload.eventType === "INSERT" && onInsert) onInsert(payload.new);
        if (payload.eventType === "UPDATE" && onUpdate) onUpdate(payload.new);
        if (payload.eventType === "DELETE" && onDelete) onDelete(payload.old);
      }
    )
    .subscribe((status) => {
      console.log(`Realtime [${tabela}]:`, status);
    });

  return channel; 
}