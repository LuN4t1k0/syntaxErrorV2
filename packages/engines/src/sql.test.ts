import { describe, expect, it } from "vitest";
import {
  calcularEsperado,
  compararSql,
  crearBaseSql,
  ejecutarConsulta,
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
    expect(resultado).toStrictEqual({ aprobada: false, diagnostico: "Tu consulta trae 4 filas, se esperan 2." });
  });

  it("avisa cuando solo falla el orden", () => {
    const tarea: SqlTarea = { solucion: "SELECT nombre FROM clientes ORDER BY nombre", comparar: "filas-en-orden" };
    expect(revisarSql(tablas, tarea, "SELECT nombre FROM clientes ORDER BY nombre DESC").diagnostico).toBe(
      "Las filas son correctas, pero el orden no coincide. Revisa el ORDER BY."
    );
  });

  it("explica el error de la consulta en español", () => {
    const resultado = revisarSql(tablas, fueraDeSantiago, "SELEC nombre FROM clientes");
    expect(resultado).toEqual({
      aprobada: false,
      diagnostico: "Tu consulta tiene un error. Línea 1: «SELEC» no es una palabra de SQL. ¿Quisiste decir SELECT?",
      errorDeCodigo: true,
    });
  });

  it("si no coincide, agrega el aviso que probablemente explica la diferencia", () => {
    expect(revisarSql(tablas, fueraDeSantiago, "SELECT nombre, ciudad FROM clientes WHERE ciudad <> Santiago").diagnostico).toBe(
      "Tu consulta trae 0 filas, se esperan 2. «Santiago» parece un texto: escríbelo entre comillas simples, 'Santiago'."
    );
  });

  it("si solo cambia una columna y hay ORDER BY, sugiere revisar los empates", () => {
    const empates: Tablas = {
      productos: [
        { nombre: "Té", unidades: 73 },
        { nombre: "Pan", unidades: 53 },
        { nombre: "Bebida", unidades: 53 },
        { nombre: "Arroz", unidades: 40 },
      ],
    };
    const tarea: SqlTarea = { solucion: "SELECT nombre, unidades FROM productos ORDER BY unidades DESC, nombre LIMIT 2", comparar: "filas-en-orden" };
    expect(revisarSql(empates, tarea, "SELECT nombre, unidades FROM productos ORDER BY unidades DESC LIMIT 2").diagnostico).toBe(
      "La columna 'nombre' no coincide en algunas filas. Si hay valores empatados en tu ORDER BY, agrega otra columna para desempatar; si no, revisa el cálculo o el filtro."
    );
    expect(revisarSql(empates, tarea, "SELECT nombre, unidades FROM productos ORDER BY unidades DESC, nombre LIMIT 2").aprobada).toBe(true);
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

describe("ejecutarConsulta", () => {
  it("devuelve las filas y los avisos", () => {
    expect(ejecutarConsulta(tablas, "SELECT nombres FROM clientes WHERE id = 1")).toEqual({
      ok: true,
      filas: [{}],
      avisos: [{ mensaje: "No existe la columna «nombres» en las tablas de esta consulta. ¿Quisiste decir «nombre»?", linea: 1 }],
    });
  });

  it("devuelve el error explicado en vez de lanzarlo", () => {
    expect(ejecutarConsulta(tablas, "SELECT * FROM cliente")).toEqual({
      ok: false,
      error: {
        mensaje: "No existe una tabla llamada «cliente».",
        sugerencia: "¿Quisiste decir «clientes»?",
        linea: 1,
        original: "Table does not exist: cliente",
      },
    });
    expect(ejecutarConsulta(tablas, "UPDATE clientes SET ciudad = 'Talca'")).toMatchObject({
      ok: false,
      error: { mensaje: "En esta tarea solo puedes usar consultas SELECT." },
    });
  });

  it("permite escribir cuando la tarea lo pide", () => {
    expect(ejecutarConsulta(tablas, "UPDATE clientes SET ciudad = 'Talca' WHERE id = 1", { permitirEscritura: true })).toMatchObject({ ok: true });
  });
});
