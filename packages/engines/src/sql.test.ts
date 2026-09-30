import { describe, expect, it } from "vitest";
import { crearBaseSql, ejecutarSql, revisarSql, type SqlTarea, type Tablas } from "./sql";

const tablas: Tablas = {
  clientes: [
    { id: 1, nombre: "Ferretería El Roble", ciudad: "Santiago" },
    { id: 2, nombre: "Almacén Doña Rosa", ciudad: "Temuco" },
    { id: 3, nombre: "Comercial Pacífico", ciudad: "Valparaíso" },
    { id: 4, nombre: "Minimarket Los Aromos", ciudad: "Santiago" },
  ],
};

describe("sql", () => {
  it("acepta punto y coma final y comentarios", () => {
    const consulta = "-- solo Santiago\nSELECT id FROM clientes /* filtro */ WHERE ciudad = 'Santiago';";
    expect(ejecutarSql(crearBaseSql(tablas), consulta)).toEqual([{ id: 1 }, { id: 4 }]);
  });

  it("rechaza escritura cuando no corresponde", () => {
    expect(() => ejecutarSql(crearBaseSql(tablas), "DELETE FROM clientes")).toThrow("solo puedes usar consultas SELECT");
  });

  it("revisa filas sin orden", () => {
    const tarea: SqlTarea = {
      solucion: "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago'",
      comparar: "filas-sin-orden",
    };
    expect(revisarSql(tablas, tarea, "SELECT nombre, ciudad FROM clientes WHERE ciudad IN ('Temuco', 'Valparaíso')")).toEqual({
      aprobada: true,
      diagnostico: null,
    });
  });
});
