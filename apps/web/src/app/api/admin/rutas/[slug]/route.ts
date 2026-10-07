import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { rutaCasos, rutas } from "@syntaxerror/db/schema";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { exigirAdmin } from "@/lib/permisos";
import { ESTADOS_ADMIN_RUTA } from "@/lib/rutas/estado";

const esquema = z.object({ estado: z.enum(ESTADOS_ADMIN_RUTA).nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const { slug } = await params;
  const db = getDb();
  const [actual] = await db.select({ id: rutas.id, estado: rutas.estado }).from(rutas).where(eq(rutas.slug, slug));
  if (!actual || actual.estado === "borrador") return NextResponse.json({ error: "ruta_no_existe" }, { status: 404 });
  if ((parsed.data.estado === "publicada" || parsed.data.estado === "beta")) {
    const [conteo] = await db.select({ total: count() }).from(rutaCasos).where(eq(rutaCasos.rutaId, actual.id));
    if (Number(conteo?.total ?? 0) === 0) return NextResponse.json({ error: "ruta_sin_casos" }, { status: 400 });
  }
  const ahora = new Date();
  await db.update(rutas).set({ estadoAdmin: parsed.data.estado, estadoCambiadoPor: parsed.data.estado === null ? null : usuario.id, estadoCambiadoEn: parsed.data.estado === null ? null : ahora, actualizadoEn: ahora }).where(eq(rutas.id, actual.id));
  const meta = metaDeRequest(request);
  await insertAuditLogEntry(db, {
    actorId: usuario.id,
    actorEmail: usuario.email,
    action: "ruta_estado_cambiado",
    targetType: "route",
    targetId: actual.id,
    metadata: { slug, estado: parsed.data.estado },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  return NextResponse.json({ ok: true });
}
