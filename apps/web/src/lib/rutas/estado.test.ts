import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sincronizarContenido } from "@syntaxerror/content/sincronizar";
import { rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { obtenerContenido } from "@/lib/contenido";

// Como en producción: sin borradores a la vista.
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");

const { guardarRutaElegida, listarRutasConEstado, mapaVisible, puedeUsarCaso } = await import("./estado");
const { db, close } = createTestDb();

async function personas() {
  const [estudiante, probador] = await db
    .insert(users)
    .values([{ email: "ana@correo.cl" }, { email: "beto@correo.cl", probador: true }])
    .returning({ id: users.id });
  return { estudiante: estudiante.id, probador: probador.id };
}

const fijarEstado = (slug: string, estadoAdmin: string | null) => db.update(rutas).set({ estadoAdmin }).where(eq(rutas.slug, slug));

beforeEach(async () => {
  await truncateAll(db);
  await sincronizarContenido(db, await obtenerContenido());
});
afterAll(() => close());

describe("estado de las rutas", () => {
  it("el estado vigente es el del admin si lo cambió, y si no el del contenido", async () => {
    const antes = await listarRutasConEstado();
    expect(antes.find((ruta) => ruta.slug === "data-analyst")).toMatchObject({ estadoVigente: "beta", estadoAdmin: null });
    expect(antes.find((ruta) => ruta.slug === "ciberseguridad")).toMatchObject({ estadoVigente: "filtrada" });
    await fijarEstado("data-analyst", "publicada");
    expect((await listarRutasConEstado()).find((ruta) => ruta.slug === "data-analyst")).toMatchObject({ estadoVigente: "publicada", estadoAdmin: "publicada" });
  });

  it("un caso se usa si está en una ruta publicada, o en beta para probadores", async () => {
    const { estudiante, probador } = await personas();
    expect(await puedeUsarCaso(db, estudiante, "clases-de-sql")).toBe(false);
    expect(await puedeUsarCaso(db, probador, "clases-de-sql")).toBe(true);
    await fijarEstado("data-analyst", "publicada");
    expect(await puedeUsarCaso(db, estudiante, "clases-de-sql")).toBe(true);
    for (const cerrada of ["filtrada", "oculta"]) {
      await fijarEstado("data-analyst", cerrada);
      expect(await puedeUsarCaso(db, probador, "clases-de-sql")).toBe(false);
    }
  });

  it("guarda la ruta elegida solo si está disponible, y explorar no la borra", async () => {
    const { estudiante, probador } = await personas();
    expect(await guardarRutaElegida(db, estudiante, "data-analyst", true)).toBe("no_disponible");
    expect(await guardarRutaElegida(db, probador, "ciberseguridad", true)).toBe("no_disponible");
    expect(await guardarRutaElegida(db, probador, "no-existe", true)).toBe("no_disponible");

    expect(await guardarRutaElegida(db, probador, "data-analyst", true)).toBe("ok");
    const [ruta] = await db.select({ id: rutas.id }).from(rutas).where(eq(rutas.slug, "data-analyst"));
    const [primera] = await db.select().from(users).where(eq(users.id, probador));
    expect(primera.rutaElegida).toBe(ruta.id);
    expect(primera.bienvenidaVistaEn).toBeInstanceOf(Date);

    // `explorar` desde "¿Cómo funciona?": la ruta queda y la bienvenida conserva la primera fecha.
    expect(await guardarRutaElegida(db, probador, null, true)).toBe("ok");
    const [despues] = await db.select().from(users).where(eq(users.id, probador));
    expect(despues.rutaElegida).toBe(ruta.id);
    expect(despues.bienvenidaVistaEn).toEqual(primera.bienvenidaVistaEn);
  });

  it("el mapa de una ruta se ve si se puede usar, o siempre en desarrollo y e2e", () => {
    expect(mapaVisible("publicada", false, false)).toBe(true);
    expect(mapaVisible("beta", false, false)).toBe(false);
    expect(mapaVisible("beta", true, false)).toBe(true);
    expect(mapaVisible("filtrada", true, false)).toBe(false);
    expect(mapaVisible("oculta", false, true)).toBe(true);
  });
});
