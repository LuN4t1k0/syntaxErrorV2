import { describe, expect, it } from "vitest";
import { estadoContinuar } from "./continuar";

const analista = { slug: "data-analyst", titulo: "Data Analyst", estadoVigente: "beta" as const, casos: ["herramientas", "sql", "ventas"] };
const otra = { slug: "otra", titulo: "Otra", estadoVigente: "publicada" as const, casos: ["sql", "redes"] };
const base = { rutas: [analista, otra], completosPorRuta: new Map([["data-analyst", 1]]), puedeBeta: true, todoVisible: false };

describe("estadoContinuar", () => {
  it("con avance, sigue el paso pendiente dentro de la ruta elegida, con su avance", () => {
    expect(estadoContinuar({ ...base, casoPendiente: "sql", elegida: analista })).toEqual({
      tipo: "paso",
      ruta: { slug: "data-analyst", titulo: "Data Analyst", completos: 1, total: 3 },
    });
  });

  it("si el paso no está en la ruta elegida, usa la primera ruta disponible que lo contiene", () => {
    expect(estadoContinuar({ ...base, casoPendiente: "redes", elegida: analista })).toMatchObject({ tipo: "paso", ruta: { slug: "otra", completos: 0, total: 2 } });
    // Sin acceso a la beta, el caso compartido se sigue por la ruta publicada.
    expect(estadoContinuar({ ...base, puedeBeta: false, casoPendiente: "sql", elegida: analista })).toMatchObject({ tipo: "paso", ruta: { slug: "otra" } });
    expect(estadoContinuar({ ...base, casoPendiente: "suelto", elegida: null })).toEqual({ tipo: "paso", ruta: null });
  });

  it("con ruta elegida y sin avance invita a empezar; si el admin la cerró, queda en pausa", () => {
    expect(estadoContinuar({ ...base, casoPendiente: null, elegida: analista })).toEqual({ tipo: "empezar", ruta: analista });
    expect(estadoContinuar({ ...base, casoPendiente: null, elegida: { ...analista, estadoVigente: "filtrada" } })).toMatchObject({ tipo: "pausa" });
    expect(estadoContinuar({ ...base, puedeBeta: false, casoPendiente: null, elegida: analista })).toMatchObject({ tipo: "pausa" });
    // En desarrollo y e2e todo está disponible.
    expect(estadoContinuar({ ...base, puedeBeta: false, todoVisible: true, casoPendiente: null, elegida: analista })).toMatchObject({ tipo: "empezar" });
  });

  it("sin ruta ni avance, si hay una sola disponible invita a empezar", () => {
    expect(estadoContinuar({ ...base, rutas: [otra], casoPendiente: null, elegida: null })).toEqual({ tipo: "empezar", ruta: otra });
  });

  it("sin ruta ni avance, con varias disponibles toca elegir", () => {
    expect(estadoContinuar({ ...base, casoPendiente: null, elegida: null })).toEqual({ tipo: "elegir" });
  });
});
