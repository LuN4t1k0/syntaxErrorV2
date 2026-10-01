import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { obtenerCaso } from "@/lib/contenido";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarSinFallar } from "@/lib/emails";
import { revisarEntregable } from "@/lib/entregables/revision";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({
  decision: z.enum(["aprobado", "observado"]),
  criterios: z.array(z.boolean()).max(20),
  comentario: z.string().max(2000).nullable(),
});
const ESTADOS = { no_existe: 404, prohibido: 403, rubrica_incompleta: 400, falta_comentario: 400 } as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await revisarEntregable(
    getDb(),
    { entregableId: id, revisor: usuario, ...parsed.data },
    { rubricaDe: async (slug) => (await obtenerCaso(slug))?.rubrica ?? null, encolar: encolarSinFallar, meta: metaDeRequest(request) }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: ESTADOS[resultado.motivo] });
  return NextResponse.json({ certificados: resultado.certificados });
}
