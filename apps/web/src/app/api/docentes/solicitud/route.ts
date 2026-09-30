import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { estadoDocencia, solicitarDocencia } from "@/lib/docentes";
import { encolarSinFallar } from "@/lib/emails";
import { exigirUsuario } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export async function GET() {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  return NextResponse.json({ estado: await estadoDocencia(getDb(), usuario) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  return NextResponse.json({ estado: await solicitarDocencia(getDb(), usuario, { encolar: encolarSinFallar }) });
}
