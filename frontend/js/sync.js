export async function enviarTurnoParaSheets(turno, registros) {
  try {
    const response = await fetch("CHAVE_API_GOOSLE_SHEETS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ turno, registros })
    });

    console.log("HTTP STATUS:", response.status);

    const text = await response.text();
    console.log("Resposta Sheets:", text);

    if (!response.ok) return false;

    const result = JSON.parse(text);
    return result.status === "ok";

  } catch (err) {
    console.error("Erro real no envio:", err);
    return false;
  }
}
