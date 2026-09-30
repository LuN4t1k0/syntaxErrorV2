import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { confirmarCambioEmail } from "@/lib/cuenta/perfil";

const esquema = z.object({ token: z.string().min(10).max(200) });

export async function POST(request: Request) {
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const resultado = await confirmarCambioEmail(getDb(), parsed.data.token, metaDeRequest(request));
  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.motivo },
      { status: resultado.motivo === "email_en_uso" ? 409 : 400 }
    );
  }

  return NextResponse.json({ ok: true, email: resultado.email });
}
