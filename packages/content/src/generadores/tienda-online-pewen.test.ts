import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { aCsv } from "./despachos-rapidos";
import { CANTIDAD_CLIENTES, CANTIDAD_PEDIDOS, DEFECTOS_PEWEN, generarTiendaOnlinePewen, PRODUCTOS_PEWEN } from "./tienda-online-pewen";

const DATOS = fileURLToPath(new URL("../../../../content/casos/tienda-online-pewen/datos/", import.meta.url));

describe("generarTiendaOnlinePewen", () => {
  const datos = generarTiendaOnlinePewen();
  const pedidos = datos.pedidos.slice(0, CANTIDAD_PEDIDOS);
  const categoria = new Map(PRODUCTOS_PEWEN.map((producto) => [producto.producto_id, producto.categoria]));

  it("genera siempre lo mismo", () => {
    expect(generarTiendaOnlinePewen()).toEqual(datos);
  });

  it("los CSV del repositorio son los generados: no se editan a mano", async () => {
    for (const [tabla, filas] of Object.entries(datos)) {
      expect(await readFile(`${DATOS}${tabla}.csv`, "utf8"), tabla).toBe(aCsv(filas));
    }
  });

  it("trae los defectos que enseña la misión de limpieza, en sus posiciones", () => {
    expect(datos.clientes).toHaveLength(CANTIDAD_CLIENTES);
    expect(datos.pedidos).toHaveLength(CANTIDAD_PEDIDOS + DEFECTOS_PEWEN.duplicados.length);
    expect(pedidos.filter((pedido) => pedido.cantidad === null).map((pedido) => pedido.pedido_id)).toEqual(DEFECTOS_PEWEN.cantidadVacia.map((indice) => 5001 + indice));
    expect(datos.pedidos.slice(CANTIDAD_PEDIDOS)).toEqual(DEFECTOS_PEWEN.duplicados.map((indice) => datos.pedidos[indice]));
    expect(datos.clientes.filter((cliente) => cliente.region === null)).toHaveLength(DEFECTOS_PEWEN.regionVacia.length);
  });

  it("los pedidos son coherentes: fechas del segundo semestre, en orden, con precio y referencias válidas", () => {
    const clientes = new Set(datos.clientes.map((cliente) => cliente.cliente_id));
    expect(pedidos.map((pedido) => pedido.fecha)).toEqual([...pedidos.map((pedido) => pedido.fecha)].sort());
    for (const pedido of pedidos) {
      expect(pedido.fecha).toMatch(/^2025-(0[7-9]|1[0-2])-\d{2}$/);
      expect(clientes.has(pedido.cliente_id)).toBe(true);
      expect(PRODUCTOS_PEWEN.find((producto) => producto.producto_id === pedido.producto_id)?.precio).toBe(pedido.precio_unitario);
    }
  });

  it("esconde los dos patrones del caso: Vestuario se devuelve más y noviembre vende más", () => {
    const tasa = (nombre: string) => {
      const deLaCategoria = pedidos.filter((pedido) => categoria.get(pedido.producto_id) === nombre);
      return deLaCategoria.filter((pedido) => pedido.estado === "devuelto").length / deLaCategoria.length;
    };
    for (const otra of ["Hogar", "Cocina", "Decoración"]) expect(tasa("Vestuario")).toBeGreaterThan(tasa(otra) * 2);
    const porMes = (mes: string) => pedidos.filter((pedido) => String(pedido.fecha).startsWith(`2025-${mes}`)).length;
    for (const mes of ["07", "08", "09", "10", "12"]) expect(porMes("11")).toBeGreaterThan(porMes(mes));
  });
});
