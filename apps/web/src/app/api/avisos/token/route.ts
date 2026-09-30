import { NextResponse } from "next/server";
import { PROPOSITO_USUARIO } from "@syntaxerror/queue/eventos";
import { firmarTokenSocket } from "@syntaxerror/queue/token-socket";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(clientId)) return NextResponse.json({ error: "falta_client_id" }, { status: 400 });
  const secreto = process.env.CHAT_SOCKET_SECRET;
  if (!secreto) return NextResponse.json({ error: "avisos_no_disponibles" }, { status: 503 });
  return NextResponse.json(
    { token: firmarTokenSocket({ userId: usuario.id, clientId, proposito: PROPOSITO_USUARIO, secreto }) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
