import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { aCsv, CANTIDAD_DESPACHOS, COMUNAS, DEFECTOS, generarDespachosRapidos } from "./despachos-rapidos";

const DATOS = fileURLToPath(new URL("../../../../content/casos/despachos-rapidos/datos/", import.meta.url));
const FECHA = /^\d{2}\/\d{2}\/2025$/;
const NOMBRES = new Set(COMUNAS.map((fila) => fila.comuna));

describe("crearAleatorio", () => {
  it("con la misma semilla repite la secuencia", () => {
    const a = crearAleatorio(7);
    const b = crearAleatorio(7);
    expect([a.siguiente(), a.entero(1, 6), a.elegir(["x", "y"])]).toEqual([b.siguiente(), b.entero(1, 6), b.elegir(["x", "y"])]);
  });
});

describe("generarDespachosRapidos", () => {
  const datos = generarDespachosRapidos();

  it("genera siempre lo mismo", () => {
    expect(generarDespachosRapidos()).toEqual(datos);
  });

  it("los CSV del repositorio son los generados: no se editan a mano", async () => {
    for (const [tabla, filas] of Object.entries(datos)) {
      expect(await readFile(`${DATOS}${tabla}.csv`, "utf8"), tabla).toBe(aCsv(filas));
    }
  });

  it("la versión limpia no tiene defectos", () => {
    const limpios = datos.despachos_limpios;
    expect(limpios).toHaveLength(CANTIDAD_DESPACHOS);
    expect(new Set(limpios.map((fila) => fila.id)).size).toBe(CANTIDAD_DESPACHOS);
    for (const fila of limpios) {
      expect(NOMBRES.has(fila.comuna)).toBe(true);
      expect(fila.fecha_pedido).toMatch(FECHA);
      expect(typeof fila.costo).toBe("number");
      if (fila.estado === "devuelto") expect(fila.fecha_entrega).toBeNull();
      else expect(fila.fecha_entrega).toMatch(FECHA);
    }
  });

  it("la versión sin limpiar trae los defectos que enseña el caso, en sus posiciones", () => {
    const sucios = datos.despachos;
    expect(sucios).toHaveLength(CANTIDAD_DESPACHOS + DEFECTOS.duplicados.length);
    for (const indice of Object.keys(DEFECTOS.comunaMalEscrita).map(Number)) {
      expect(NOMBRES.has(sucios[indice].comuna), String(sucios[indice].comuna)).toBe(false);
      expect(String(sucios[indice].comuna).trim().toLowerCase()).toBe(String(datos.despachos_limpios[indice].comuna).toLowerCase());
    }
    for (const indice of DEFECTOS.fechaComoTexto) expect(sucios[indice].fecha_entrega).toMatch(/^2025-\d{2}-\d{2}$/);
    for (const indice of DEFECTOS.costoVacio) expect(sucios[indice].costo).toBeNull();
    expect(sucios.slice(CANTIDAD_DESPACHOS)).toEqual(DEFECTOS.duplicados.map((indice) => sucios[indice]));
  });

  it("tiene variedad para los resúmenes: devoluciones, atrasos y comunas con distinto volumen", () => {
    const limpios = datos.despachos_limpios;
    expect(limpios.filter((fila) => fila.estado === "devuelto").length).toBeGreaterThanOrEqual(3);
    expect(new Set(limpios.map((fila) => fila.comuna)).size).toBeGreaterThanOrEqual(10);
  });
});
