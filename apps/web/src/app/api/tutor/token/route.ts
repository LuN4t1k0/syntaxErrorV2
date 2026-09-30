import { NextResponse } from "next/server";
import { PROPOSITO_TUTOR } from "@syntaxerror/queue/eventos";
import { firmarTokenSocket } from "@syntaxerror/queue/token-socket";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(clientId)) return NextResponse.json({ error: "falta_client_id" }, { status: 400 });
  const secreto = process.env.CHAT_SOCKET_SECRET;
  if (!secreto) return NextResponse.json({ error: "tutor_no_disponible" }, { status: 503 });
  return NextResponse.json(
    { token: firmarTokenSocket({ userId, clientId, proposito: PROPOSITO_TUTOR, secreto }) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
