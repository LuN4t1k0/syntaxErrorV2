import { eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { enlaceCertificado } from "@/lib/cuenta/enlaces";
import type { Encolar } from "@/lib/emails";
import { emitirCertificadosDelCaso, type CertificadoEmitido } from "./servicio";

export async function otorgarCertificados(
  db: AppDb,
  userId: string,
  casoSlug: string,
  encolar: Encolar
): Promise<CertificadoEmitido[]> {
  const emitidos = await emitirCertificadosDelCaso(db, userId, casoSlug);
  if (emitidos.length === 0) return emitidos;

  const [usuario] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId));
  if (!usuario) return emitidos;

  for (const certificado of emitidos) {
    await encolar({
      tipo: "certificado-emitido",
      para: usuario.email,
      nombre: usuario.name,
      titulo: certificado.tipo === "ruta" ? `la ruta ${certificado.titulo}` : `el caso ${certificado.titulo}`,
      enlace: enlaceCertificado(certificado.codigo),
    });
  }

  return emitidos;
}
