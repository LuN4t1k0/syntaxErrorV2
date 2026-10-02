import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { aCsv } from "./despachos-rapidos";
import { CANTIDAD_VENTAS, generarMinimarketsDelSur, LOCAL_EN_REMODELACION, PRODUCTOS } from "./minimarkets-del-sur";

const DATOS = fileURLToPath(new URL("../../../../content/casos/minimarkets-del-sur/datos/", import.meta.url));

describe("generarMinimarketsDelSur", () => {
  const datos = generarMinimarketsDelSur();
  const ventasDe = (local: number, mes: string) =>
    datos.ventas.filter((venta) => venta.local_id === local && String(venta.fecha).startsWith(`2025-${mes}`)).reduce((suma, venta) => suma + Number(venta.monto), 0);

  it("genera siempre lo mismo", () => {
    expect(generarMinimarketsDelSur()).toEqual(datos);
  });

  it("los CSV del repositorio son los generados: no se editan a mano", async () => {
    for (const [tabla, filas] of Object.entries(datos)) {
      expect(await readFile(`${DATOS}${tabla}.csv`, "utf8"), tabla).toBe(aCsv(filas));
    }
  });

  it("las ventas son coherentes: ids correlativos por fecha, montos y referencias válidas", () => {
    const productos = new Map(PRODUCTOS.map((producto) => [producto.id, producto]));
    expect(datos.ventas).toHaveLength(CANTIDAD_VENTAS);
    datos.ventas.forEach((venta, indice) => {
      expect(venta.id).toBe(indice + 1);
      expect(venta.fecha).toMatch(/^2025-0[1-3]-\d{2}$/);
      expect(Number(venta.monto)).toBe(Number(productos.get(venta.producto_id)?.precio) * Number(venta.cantidad));
      expect(datos.locales.some((local) => local.id === venta.local_id)).toBe(true);
    });
    expect([...datos.ventas].map((venta) => venta.fecha)).toEqual([...datos.ventas].map((venta) => venta.fecha).sort());
  });

  it("cuenta la historia del caso: Osorno es el último en marzo, no en enero, y cae mes a mes", () => {
    const ids = datos.locales.map((local) => Number(local.id));
    const ultimoDe = (mes: string) => ids.reduce((menor, id) => (ventasDe(id, mes) < ventasDe(menor, mes) ? id : menor));
    expect(ultimoDe("03")).toBe(LOCAL_EN_REMODELACION);
    expect(ultimoDe("01")).not.toBe(LOCAL_EN_REMODELACION);
    expect(ventasDe(LOCAL_EN_REMODELACION, "03")).toBeLessThan(ventasDe(LOCAL_EN_REMODELACION, "01") / 3);
  });

  it("la kombucha artesanal está en el catálogo pero no tiene ventas", () => {
    expect(datos.productos.some((producto) => producto.id === 406)).toBe(true);
    expect(datos.ventas.some((venta) => venta.producto_id === 406)).toBe(false);
  });
});
