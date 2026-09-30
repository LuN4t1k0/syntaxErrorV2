import { createHmac, timingSafeEqual } from "node:crypto";

const DURACION_MS = 60 * 60 * 1000;

type Datos = { userId: string; clientId: string; proposito: string };

function firmar(payload: string, secreto: string): string {
  return createHmac("sha256", secreto).update(payload).digest("hex");
}

export function firmarTokenSocket({
  userId,
  clientId,
  proposito,
  secreto,
  ahora = Date.now(),
}: Datos & { secreto: string; ahora?: number }): string {
  const payload = Buffer.from(JSON.stringify({ userId, clientId, proposito, expiraEn: ahora + DURACION_MS })).toString("base64url");
  return `${payload}.${firmar(payload, secreto)}`;
}

export function verificarTokenSocket({
  token,
  clientId,
  proposito,
  secreto,
  ahora = Date.now(),
}: {
  token: string;
  clientId: string;
  proposito: string;
  secreto: string;
  ahora?: number;
}): { userId: string } | null {
  const [payload, firmaRecibida] = token.split(".");
  if (!payload || !firmaRecibida || !secreto) return null;

  const esperada = Buffer.from(firmar(payload, secreto), "hex");
  const recibida = Buffer.from(firmaRecibida, "hex");
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;

  try {
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<Datos & { expiraEn: number }>;
    if (datos.clientId !== clientId || datos.proposito !== proposito) return null;
    if (typeof datos.userId !== "string" || typeof datos.expiraEn !== "number" || datos.expiraEn <= ahora) return null;
    return { userId: datos.userId };
  } catch {
    return null;
  }
}
