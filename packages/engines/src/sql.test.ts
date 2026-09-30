import { describe, expect, it } from "vitest";
import {
  calcularEsperado,
  compararSql,
  crearBaseSql,
  ejecutarSql,
  revisarSql,
  type SqlTarea,
  type Tablas,
} from "./sql";

const tablas: Tablas = {
  clientes: [
    { id: 1, nombre: "Ferretería El Roble", ciudad: "Santiago" },
    { id: 2, nombre: "Almacén Doña Rosa", ciudad: "Temuco" },
    { id: 3, nombre: "Comercial Pacífico", ciudad: "Valparaíso" },
    { id: 4, nombre: "Minimarket Los Aromos", ciudad: "Santiago" },
  ],
};

const fueraDeSantiago: SqlTarea = {
  solucion: "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago'",
  comparar: "filas-sin-orden",
};

describe("ejecutarSql", () => {
  it("devuelve las filas de un SELECT", () => {
    const filas = ejecutarSql(crearBaseSql(tablas), "SELECT id FROM clientes WHERE ciudad = 'Santiago'");
    expect(filas).toEqual([{ id: 1 }, { id: 4 }]);
  });

  it("acepta punto y coma final y comentarios", () => {
    const consulta = "-- solo Santiago\nSELECT id FROM clientes /* filtro */ WHERE ciudad = 'Santiago';";
    expect(ejecutarSql(crearBaseSql(tablas), consulta)).toEqual([{ id: 1 }, { id: 4 }]);
  });

  it("rechaza sentencias que modifican datos si la tarea no lo permite", () => {
    expect(() => ejecutarSql(crearBaseSql(tablas), "DELETE FROM clientes")).toThrow(
      "En esta tarea solo puedes usar consultas SELECT."
    );
  });

  it("rechaza una consulta vacía o solo con comentarios", () => {
    expect(() => ejecutarSql(crearBaseSql(tablas), "  -- nada\n")).toThrow("Escribe una consulta antes de ejecutar.");
  });

  it("acepta como alias palabras que alasql reserva, como total o count", () => {
    const consulta = "SELECT COUNT(*) AS count, COUNT(*) AS Total FROM clientes WHERE ciudad = 'Santiago'";
    expect(ejecutarSql(crearBaseSql(tablas), consulta)).toEqual([{ count: 2, Total: 2 }]);
  });

  it("redondea decimales para comparar sin ruido de punto flotante", () => {
    expect(ejecutarSql(crearBaseSql(tablas), "SELECT 0.1 + 0.2 AS total")).toEqual([{ total: 0.3 }]);
  });
});

describe("revisarSql", () => {
  it("aprueba la solución en otro orden cuando comparar es filas-sin-orden", () => {
    const consulta = "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago' ORDER BY nombre DESC";
    expect(revisarSql(tablas, fueraDeSantiago, consulta)).toEqual({ aprobada: true, diagnostico: null });
  });

  it("acepta columnas con otro alias, en el mismo orden", () => {
    const consulta = "SELECT nombre AS cliente, ciudad AS comuna FROM clientes WHERE ciudad <> 'Santiago'";
    expect(revisarSql(tablas, fueraDeSantiago, consulta).aprobada).toBe(true);
  });

  it("dice cuántas filas trae y cuántas se esperan", () => {
    const resultado = revisarSql(tablas, fueraDeSantiago, "SELECT nombre, ciudad FROM clientes");
    expect(resultado).toEqual({ aprobada: false, diagnostico: "Tu consulta trae 4 filas, se esperan 2." });
  });

  it("avisa cuando solo falla el orden", () => {
    const tarea: SqlTarea = { solucion: "SELECT nombre FROM clientes ORDER BY nombre", comparar: "filas-en-orden" };
    expect(revisarSql(tablas, tarea, "SELECT nombre FROM clientes ORDER BY nombre DESC").diagnostico).toBe(
      "Las filas son correctas, pero el orden no coincide. Revisa el ORDER BY."
    );
  });

  it("muestra el error de sintaxis de la consulta", () => {
    const resultado = revisarSql(tablas, fueraDeSantiago, "SELEC nombre FROM clientes");
    expect(resultado.aprobada).toBe(false);
    expect(resultado.diagnostico).toMatch(/^Tu consulta tiene un error: /);
  });

  it("compara el estado de la tabla después de un UPDATE", () => {
    const tarea: SqlTarea = {
      solucion: "UPDATE clientes SET ciudad = 'Viña del Mar' WHERE id = 3",
      comparar: "estado-tabla",
      verificar: "SELECT id, ciudad FROM clientes ORDER BY id",
    };
    expect(revisarSql(tablas, tarea, "update clientes set ciudad='Viña del Mar' where id=3;").aprobada).toBe(true);
    expect(revisarSql(tablas, tarea, "UPDATE clientes SET ciudad = 'Viña del Mar' WHERE id = 2").diagnostico).toBe(
      "La columna 'ciudad' no coincide en algunas filas. Revisa el cálculo o el filtro."
    );
  });

  it("cada revisión usa una copia: un DELETE del alumno no afecta a la siguiente", () => {
    const tarea: SqlTarea = {
      solucion: "DELETE FROM clientes WHERE id = 4",
      comparar: "estado-tabla",
      verificar: "SELECT id FROM clientes ORDER BY id",
    };
    expect(revisarSql(tablas, tarea, "DELETE FROM clientes").aprobada).toBe(false);
    expect(tablas.clientes).toHaveLength(4);
    expect(revisarSql(tablas, fueraDeSantiago, fueraDeSantiago.solucion).aprobada).toBe(true);
  });

  it("compararSql usa las filas esperadas calculadas de antemano", () => {
    const esperadas = calcularEsperado(tablas, fueraDeSantiago);
    expect(esperadas).toHaveLength(2);
    const consulta = "SELECT nombre, ciudad FROM clientes WHERE ciudad IN ('Temuco', 'Valparaíso')";
    expect(compararSql(tablas, { comparar: "filas-sin-orden", esperadas }, consulta).aprobada).toBe(true);
  });
});
