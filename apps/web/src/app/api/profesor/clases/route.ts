import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { crearClase } from "@/lib/clases/servicio";
import { exigirDocente } from "@/lib/permisos";
import { rutasParaClases } from "@/lib/rutas/estado";

const esquema = z.object({ titulo: z.string().trim().min(1).max(120), ruta: z.string().max(100) });

export async function POST(request: Request) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  // Solo rutas con casos que el docente puede usar, según el estado vigente: un borrador o una filtrada no se asignan.
  const disponibles = (await rutasParaClases(getDb(), usuario.id)).map((ruta) => ruta.slug);
  if (!disponibles.includes(parsed.data.ruta)) return NextResponse.json({ error: "ruta_no_disponible" }, { status: 400 });
  const clase = await crearClase(getDb(), { profesorId: usuario.id, titulo: parsed.data.titulo, rutaSlug: parsed.data.ruta });
  if (!clase) return NextResponse.json({ error: "ruta_no_disponible" }, { status: 400 });
  return NextResponse.json({ id: clase.id, codigo: clase.codigo }, { status: 201 });
}
