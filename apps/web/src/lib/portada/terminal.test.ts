import { describe, expect, it } from "vitest";
import { CONSULTA_INICIAL, interpretarTerminalPortada, salidaSqlExitosa, type RutaTerminalPortada } from "./terminal";

const rutas: RutaTerminalPortada[] = [
  {
    slug: "data-analyst",
    cargo: "Data Analyst",
    descripcion: "Aprende datos desde cero.",
    estadoVigente: "publicada",
    leak: "LEAK_0x11",
  },
  {
    slug: "ciberseguridad",
    cargo: "Analista SOC",
    descripcion: "Defensa digital.",
    teaser: "Próxima ruta.",
    estadoVigente: "filtrada",
    leak: "LEAK_0x12",
  },
];

describe("terminal de portada", () => {
  it("devuelve ayuda", () => {
    expect(interpretarTerminalPortada("help", rutas)).toMatchObject({ tipo: "lineas" });
    expect(interpretarTerminalPortada("ayuda", rutas)).toMatchObject({ tipo: "lineas" });
  });

  it("lista rutas abiertas y filtradas", () => {
    const respuesta = interpretarTerminalPortada("ls rutas", rutas);
    expect(respuesta).toMatchObject({ tipo: "lineas" });
    if (respuesta.tipo !== "lineas") throw new Error("respuesta inesperada");
    expect(respuesta.lineas.map((linea) => linea.texto)).toEqual([
      "data-analyst/ · Data Analyst · [abierta]",
      "ciberseguridad/ · LEAK_0x12 · compilando",
    ]);
  });

  it("muestra ficha de ruta abierta y teaser de ruta filtrada", () => {
    expect(interpretarTerminalPortada("cat data-analyst", rutas)).toMatchObject({
      tipo: "lineas",
      lineas: [{ texto: "data-analyst/ · Data Analyst" }, { texto: "Aprende datos desde cero.", tipo: "muted" }],
    });
    expect(interpretarTerminalPortada("cat ciberseguridad", rutas)).toMatchObject({
      tipo: "lineas",
      lineas: [{ texto: "LEAK_0x12 · ciberseguridad/ · compilando", tipo: "muted" }, { texto: "Próxima ruta." }],
    });
  });

  it("navega a registro con start", () => {
    expect(interpretarTerminalPortada("./start", rutas)).toEqual({ tipo: "navegar", href: "/registro" });
    expect(interpretarTerminalPortada("registro", rutas)).toEqual({ tipo: "navegar", href: "/registro" });
  });

  it("limpia, resetea y trata otros textos como SQL", () => {
    expect(interpretarTerminalPortada("clear", rutas)).toEqual({ tipo: "clear" });
    expect(interpretarTerminalPortada("reset", rutas)).toMatchObject({ tipo: "reset", consulta: CONSULTA_INICIAL });
    expect(interpretarTerminalPortada("SELECT * FROM ventas", rutas)).toEqual({ tipo: "sql", consulta: "SELECT * FROM ventas" });
  });

  it("invita a continuar después de la primera ejecución correcta", () => {
    expect(salidaSqlExitosa([{ comuna: "Temuco", total: 442000 }], false).at(-1)?.texto).toContain("./start");
    expect(salidaSqlExitosa([{ comuna: "Temuco", total: 442000 }], true).some((linea) => linea.texto.includes("./start"))).toBe(false);
  });
});
