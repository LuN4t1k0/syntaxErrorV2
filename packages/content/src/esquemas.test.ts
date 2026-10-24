import { describe, expect, it } from "vitest";
import { rutaSchema } from "./esquemas";

const base = { slug: "ciberseguridad", titulo: "Ciberseguridad", cargo: "Analista SOC junior", descripcion: "Monitorea incidentes." };

describe("rutaSchema", () => {
  it("una ruta filtrada o en borrador puede no tener casos todavía", () => {
    expect(rutaSchema.parse({ ...base, estado: "filtrada", teaser: "Pronto" })).toMatchObject({ casos: [], teaser: "Pronto" });
    expect(rutaSchema.safeParse({ ...base, estado: "borrador", casos: [] }).success).toBe(true);
  });

  it("las tecnologías de la ruta son opcionales", () => {
    expect(rutaSchema.parse({ ...base, estado: "filtrada" }).tecnologias).toEqual([]);
    expect(rutaSchema.parse({ ...base, estado: "filtrada", tecnologias: ["SQL", "Excel"] }).tecnologias).toEqual(["SQL", "Excel"]);
  });

  it("una ruta publicada o en beta necesita al menos un caso", () => {
    for (const estado of ["publicada", "beta"]) {
      const resultado = rutaSchema.safeParse({ ...base, estado, casos: [] });
      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0]).toMatchObject({ path: ["casos"], message: "la ruta necesita al menos un caso" });
    }
  });
});
