export type RespuestaJson = { ok: boolean; status: number; error: string | null; datos: Record<string, unknown> };

export async function enviarJson(url: string, metodo: "POST" | "PATCH" | "DELETE", cuerpo?: unknown): Promise<RespuestaJson> {
  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const datos = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: respuesta.ok, status: respuesta.status, error: typeof datos.error === "string" ? datos.error : null, datos };
  } catch {
    return { ok: false, status: 0, error: "sin_conexion", datos: {} };
  }
}
