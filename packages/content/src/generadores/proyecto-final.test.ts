import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AGNO_SIN_INFORMACION, COMUNA_CON_MAYOR_CAIDA, conMiles, FILA_TOTAL, FILAS_SIN_INFORMACION, filasMatricula, generarProyectoFinal } from "./proyecto-final";

const DATOS = fileURLToPath(new URL("../../../../content/casos/proyecto-final/datos/", import.meta.url));

describe("generarProyectoFinal", () => {
  const filas = filasMatricula();
  const detalle = filas.filter((fila) => fila.comuna !== FILA_TOTAL);
  const totales = filas.filter((fila) => fila.comuna === FILA_TOTAL);

  it("genera siempre lo mismo", () => {
    expect(generarProyectoFinal()).toEqual(generarProyectoFinal());
  });

  it("el CSV del repositorio es el generado: no se edita a mano", async () => {
    expect(await readFile(`${DATOS}matricula_comunal.csv`, "utf8")).toBe(generarProyectoFinal().matricula_comunal);
  });

  it("tiene el formato de un portal público: punto y coma, miles con punto y «s/i»", () => {
    const lineas = generarProyectoFinal().matricula_comunal.trim().split("\n");
    expect(lineas[0]).toBe("agno;region;comuna;dependencia;matricula");
    expect(lineas).toHaveLength(126);
    expect(lineas.filter((linea) => linea.endsWith(";s/i"))).toHaveLength(FILAS_SIN_INFORMACION);
    expect(lineas.filter((linea) => linea.includes(`;${FILA_TOTAL};`))).toHaveLength(5);
    expect(conMiles(151372)).toBe("151.372");
    expect(conMiles(180)).toBe("180");
  });

  it("cada total regional suma su detalle, y los «s/i» solo están en un año", () => {
    for (const total of totales) {
      const delAgno = detalle.filter((fila) => fila.agno === total.agno);
      expect(delAgno).toHaveLength(24);
      expect(delAgno.reduce((suma, fila) => suma + fila.matricula, 0)).toBe(total.matricula);
    }
    expect(new Set(detalle.filter((fila) => fila.sinInformacion).map((fila) => fila.agno))).toEqual(new Set([AGNO_SIN_INFORMACION]));
    expect(detalle.filter((fila) => fila.sinInformacion && fila.dependencia === "Municipal")).toHaveLength(0);
  });

  it("muestra lo que el análisis tiene que encontrar: la matrícula municipal cae en todas las comunas, y más en Cauquenes", () => {
    const municipal = (comuna: string, agno: number) => detalle.find((fila) => fila.comuna === comuna && fila.agno === agno && fila.dependencia === "Municipal")!.matricula;
    const comunas = [...new Set(detalle.map((fila) => fila.comuna))];
    const caida = (comuna: string) => (municipal(comuna, 2024) - municipal(comuna, 2020)) / municipal(comuna, 2020);
    for (const comuna of comunas) expect(caida(comuna)).toBeLessThan(0);
    for (const comuna of comunas.filter((otra) => otra !== COMUNA_CON_MAYOR_CAIDA)) expect(caida(COMUNA_CON_MAYOR_CAIDA)).toBeLessThan(caida(comuna) * 2);
  });
});
