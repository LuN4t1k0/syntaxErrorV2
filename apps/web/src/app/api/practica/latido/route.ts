import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { registrarLatido } from "@/lib/practica/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

// Un minuto de práctica en una lección. El servidor decide si cuenta: el navegador solo avisa que sigue ahí.
export async function POST() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const contado = await registrarLatido(getDb(), userId);
  return NextResponse.json({ contado });
}
