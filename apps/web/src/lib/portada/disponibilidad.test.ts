import { describe, expect, it } from "vitest";
import { estadoPortada } from "./disponibilidad";

describe("disponibilidad de la ruta promovida en portada", () => {
  it("no confunde otra ruta publicada con Data Analyst", () => {
    expect(
      estadoPortada(
        [{ slug: "ciberseguridad", estadoVigente: "publicada" }],
        false,
      ),
    ).toBe("no-disponible");
    expect(
      estadoPortada(
        [
          { slug: "ciberseguridad", estadoVigente: "publicada" },
          { slug: "data-analyst", estadoVigente: "publicada" },
        ],
        false,
      ),
    ).toBe("disponible");
  });

  it("advierte del acceso restringido de beta", () => {
    expect(
      estadoPortada([{ slug: "data-analyst", estadoVigente: "beta" }], false),
    ).toBe("beta");
  });

  it.each(["filtrada", "oculta", "borrador"] as const)(
    "no promete acceso para estado %s",
    (estadoVigente) => {
      expect(
        estadoPortada([{ slug: "data-analyst", estadoVigente }], false),
      ).toBe("no-disponible");
    },
  );

  it("respeta el acceso al contenido de desarrollo", () => {
    expect(
      estadoPortada([{ slug: "data-analyst", estadoVigente: "beta" }], true),
    ).toBe("disponible");
    expect(estadoPortada([], true)).toBe("no-disponible");
  });
});
