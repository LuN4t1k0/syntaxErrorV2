import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { casoInscripciones, casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Encolar } from "@/lib/emails";
import { otorgarCertificados } from "./otorgar";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("otorgarCertificados", () => {
  it("avisa por email con el enlace a cada certificado nuevo, y no repite el aviso", async () => {
    const [usuario] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana" }).returning({ id: users.id });
    const [caso] = await db
      .insert(casos)
      .values({
        slug: "ventas",
        titulo: "Ventas de marzo",
        cargo: "Analista",
        empresa: "Distribuidora",
        entregable: "Repo",
        misiones: [],
      })
      .returning({ id: casos.id });
    await db.insert(casoInscripciones).values({ userId: usuario.id, casoId: caso.id, completadoEn: new Date() });

    const [certificado] = await otorgarCertificados(db, usuario.id, "ventas", encolar);
    expect(enviados).toEqual([
      {
        tipo: "certificado-emitido",
        para: "ana@correo.cl",
        nombre: "Ana",
        titulo: "el caso Ventas de marzo",
        enlace: expect.stringContaining(`/certificados/${certificado.codigo}`),
      },
    ]);

    await otorgarCertificados(db, usuario.id, "ventas", encolar);
    expect(enviados).toHaveLength(1);
  });
});
