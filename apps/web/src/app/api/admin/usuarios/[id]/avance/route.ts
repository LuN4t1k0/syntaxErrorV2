import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { enviarAvance, MAXIMO_NOTA } from "@/lib/avance/enviar";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarEmail } from "@/lib/emails";
import { exigirAdmin } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const avanceSchema = z.object({ nota: z.string().max(MAXIMO_NOTA).optional() });
const noExiste = () => NextResponse.json({ error: "no_existe" }, { status: 404 });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return noExiste();
  const parsed = avanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  try {
    const resultado = await enviarAvance(getDb(), { admin: usuario, userId: id, nota: parsed.data.nota ?? null }, { encolar: encolarEmail, meta: metaDeRequest(request) });
    if (resultado === "no_existe") return noExiste();
    if (resultado === "reciente") return NextResponse.json({ error: "reciente" }, { status: 429 });
    return NextResponse.json({ ok: true });
  } catch (fallo) {
    // encolarEmail (no encolarSinFallar): si Redis no responde, quien envía lo sabe y puede reintentar.
    console.error("[avance] no se pudo encolar el email", fallo);
    return NextResponse.json({ error: "cola_no_disponible" }, { status: 503 });
  }
}
