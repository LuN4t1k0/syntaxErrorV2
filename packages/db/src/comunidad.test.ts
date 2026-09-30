import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, clases, preguntasProfesor, rutas, solicitudesDocente, transaccionesPuntos, users } from "./schema";
import { createTestDb, truncateAll } from "./testing";

const { db, close } = createTestDb();

async function persona(email: string): Promise<string> {
  const [fila] = await db.insert(users).values({ email }).returning({ id: users.id });
  return fila.id;
}

async function caso(): Promise<string> {
  const [fila] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  return fila.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("tablas de comunidad", () => {
  it("cada logro suma puntos una sola vez", async () => {
    const userId = await persona("ana@correo.cl");
    const casoId = await caso();
    const logro = { userId, casoId, clave: "m1", motivo: "mision_aprobada", cantidad: 10 };
    expect(await db.insert(transaccionesPuntos).values(logro).onConflictDoNothing().returning()).toHaveLength(1);
    expect(await db.insert(transaccionesPuntos).values(logro).onConflictDoNothing().returning()).toHaveLength(0);
  });

  it("solo hay una solicitud docente pendiente por persona, pero se puede volver a pedir tras un rechazo", async () => {
    const userId = await persona("ana@correo.cl");
    const [primera] = await db.insert(solicitudesDocente).values({ userId }).returning();
    expect(await db.insert(solicitudesDocente).values({ userId }).onConflictDoNothing().returning()).toHaveLength(0);
    await db.update(solicitudesDocente).set({ estado: "rechazada" }).where(eq(solicitudesDocente.id, primera.id));
    expect(await db.insert(solicitudesDocente).values({ userId }).onConflictDoNothing().returning()).toHaveLength(1);
  });

  it("si se elimina la cuenta docente, sus clases se borran y sus preguntas pasan a administración", async () => {
    const profesorId = await persona("docente@correo.cl");
    const alumnoId = await persona("ana@correo.cl");
    const casoId = await caso();
    const [ruta] = await db
      .insert(rutas)
      .values({ slug: "analista", titulo: "Analista", cargo: "Analista", descripcion: "Ruta" })
      .returning({ id: rutas.id });
    const [clase] = await db.insert(clases).values({ profesorId, rutaId: ruta.id, titulo: "Clase", codigo: "ABC234" }).returning();
    await db.insert(preguntasProfesor).values({ alumnoId, casoId, mision: "m1", claseId: clase.id, profesorId, texto: "¿Cómo filtro?" });

    await db.delete(users).where(eq(users.id, profesorId));

    expect(await db.select().from(clases)).toEqual([]);
    const [pregunta] = await db.select().from(preguntasProfesor);
    expect(pregunta).toMatchObject({ profesorId: null, claseId: null, estado: "pendiente" });
  });
});
