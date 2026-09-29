// Asume un solo proxy de confianza delante de la app (el edge de Railway). Ese proxy agrega
// la IP real al final de x-forwarded-for; lo que venga antes lo puede escribir el cliente.
// x-real-ip se ignora porque el cliente también puede mandarlo.
export function getClientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  return last ?? "unknown";
}
