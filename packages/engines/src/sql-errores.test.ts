import { describe, expect, it } from "vitest";
import { crearBaseSql, ejecutarSql, type Tablas } from "./sql";
import { avisosSql, esquemaDe, explicarErrorSql, tokensSql } from "./sql-errores";

const tablas: Tablas = {
  clientes: [
    { id: 1, nombre: "Ferretería El Roble", ciudad: "Santiago" },
    { id: 2, nombre: "Almacén Doña Rosa", ciudad: "Temuco" },
  ],
  ventas: [
    { id: 101, cliente_id: 1, monto: 185000 },
    { id: 102, cliente_id: 2, monto: 62000 },
  ],
};

// Ejecuta de verdad para traducir el mensaje real de alasql, no uno inventado.
function explicar(consulta: string) {
  try {
    ejecutarSql(crearBaseSql(tablas), consulta);
  } catch (error) {
    return explicarErrorSql(consulta, error instanceof Error ? error.message : String(error), tablas);
  }
  throw new Error(`La consulta no falló: ${consulta}`);
}

describe("tokensSql", () => {
  it("separa palabras, textos, números y símbolos, con su línea, sin comentarios", () => {
    expect(tokensSql("SELECT nombre -- nota\nFROM clientes WHERE id >= 2 AND ciudad = 'Temuco'")).toEqual([
      { tipo: "palabra", valor: "SELECT", linea: 1 },
      { tipo: "palabra", valor: "nombre", linea: 1 },
      { tipo: "palabra", valor: "FROM", linea: 2 },
      { tipo: "palabra", valor: "clientes", linea: 2 },
      { tipo: "palabra", valor: "WHERE", linea: 2 },
      { tipo: "palabra", valor: "id", linea: 2 },
      { tipo: "simbolo", valor: ">=", linea: 2 },
      { tipo: "numero", valor: "2", linea: 2 },
      { tipo: "palabra", valor: "AND", linea: 2 },
      { tipo: "palabra", valor: "ciudad", linea: 2 },
      { tipo: "simbolo", valor: "=", linea: 2 },
      { tipo: "texto", valor: "'Temuco'", linea: 2, abierto: false },
    ]);
  });

  it("marca el texto sin comilla de cierre", () => {
    expect(tokensSql("WHERE ciudad = 'Temuco").at(-1)).toEqual({ tipo: "texto", valor: "'Temuco", linea: 1, abierto: true });
  });
});

describe("esquemaDe", () => {
  it("lista las columnas de cada tabla", () => {
    expect(esquemaDe(tablas)).toEqual({ clientes: ["id", "nombre", "ciudad"], ventas: ["id", "cliente_id", "monto"] });
  });
});

describe("explicarErrorSql", () => {
  it("tabla inexistente: sugiere la parecida y marca la línea", () => {
    expect(explicar("SELECT nombre\nFROM cliente")).toEqual({
      mensaje: "No existe una tabla llamada «cliente».",
      sugerencia: "¿Quisiste decir «clientes»?",
      linea: 2,
      original: "Table does not exist: cliente",
    });
  });

  it("tabla con otras mayúsculas: recuerda que los nombres las distinguen", () => {
    expect(explicar("SELECT nombre FROM Clientes")).toMatchObject({
      mensaje: "No existe una tabla llamada «Clientes».",
      sugerencia: "¿Quisiste decir «clientes»? Los nombres distinguen mayúsculas y minúsculas.",
    });
  });

  it("tabla sin parecido: lista las del caso", () => {
    expect(explicar("SELECT * FROM productos").sugerencia).toBe("Las tablas de este caso son: clientes, ventas.");
  });

  it("función de planilla: da el nombre en SQL", () => {
    expect(explicar("SELECT SUMA(monto) FROM ventas")).toMatchObject({
      mensaje: "SQL no conoce la función SUMA.",
      sugerencia: "En SQL se escribe SUM. SUMA es el nombre en las planillas en español.",
    });
    expect(explicar("SELECT PROMEDIO(monto) FROM ventas").sugerencia).toBe("En SQL se escribe AVG. PROMEDIO es el nombre en las planillas en español.");
  });

  it("función mal escrita: sugiere la parecida", () => {
    expect(explicar("SELECT COUNTT(*) FROM ventas")).toMatchObject({ mensaje: "SQL no conoce la función COUNTT.", sugerencia: "¿Quisiste decir COUNT?" });
  });

  it("alias o tabla inexistente antes del punto", () => {
    expect(explicar("SELECT clientes.nombre FROM clientes JOIN ventas ON venta.cliente_id = clientes.id")).toMatchObject({
      mensaje: "«venta» no es una tabla ni un alias de esta consulta.",
      sugerencia: "¿Quisiste decir «ventas»?",
      linea: 1,
    });
  });

  it("comilla sin cerrar", () => {
    expect(explicar("SELECT nombre FROM clientes WHERE ciudad = 'Santiago")).toMatchObject({
      mensaje: "Hay una comilla sin cerrar.",
      sugerencia: "Los textos van entre comillas simples y se cierran con la misma comilla: 'Santiago'.",
    });
  });

  it("paréntesis sin cerrar o de más", () => {
    expect(explicar("SELECT nombre FROM clientes WHERE (ciudad = 'Santiago'").mensaje).toBe("Falta cerrar un paréntesis.");
    expect(explicar("SELECT COUNT(*)) FROM clientes").mensaje).toBe("Sobra un paréntesis de cierre «)».");
  });

  it("coma de más antes de FROM", () => {
    expect(explicar("SELECT nombre, FROM clientes")).toMatchObject({
      mensaje: "Sobra una coma antes de FROM.",
      sugerencia: "La última columna de la lista no lleva coma.",
    });
  });

  it("cláusula sin terminar", () => {
    expect(explicar("SELECT ciudad, COUNT(*) FROM clientes GROUP BY")).toMatchObject({
      mensaje: "Después de GROUP BY falta la columna para agrupar.",
      sugerencia: "Por ejemplo: GROUP BY ciudad",
    });
    expect(explicar("SELECT * FROM clientes ORDER BY").mensaje).toBe("Después de ORDER BY falta la columna para ordenar.");
    expect(explicar("SELECT * FROM clientes WHERE").mensaje).toBe("Después de WHERE falta la condición.");
    expect(explicar("SELECT ciudad FROM clientes GROUP BY ciudad HAVING").mensaje).toBe("Después de HAVING falta la condición sobre cada grupo.");
  });

  it("LIMIT sin número", () => {
    expect(explicar("SELECT * FROM clientes LIMIT abc")).toMatchObject({ mensaje: "LIMIT necesita un número.", sugerencia: "Por ejemplo: LIMIT 10" });
  });

  it("palabra clave mal escrita", () => {
    expect(explicar("SELEC nombre FROM clientes")).toMatchObject({ mensaje: "«SELEC» no es una palabra de SQL.", sugerencia: "¿Quisiste decir SELECT?", linea: 1 });
    expect(explicar("SELECT nombre FROM clientes\nWHER ciudad = 'Temuco'")).toMatchObject({ sugerencia: "¿Quisiste decir WHERE?", linea: 2 });
  });

  it("error de sintaxis sin regla: muestra dónde se perdió SQL", () => {
    const error = explicar("SELECT nombre FROM clientes WHERE ciudad = = 'Temuco'");
    expect(error.mensaje).toMatch(/^SQL no entiende la consulta cerca de: «.+»\.$/);
    expect(error.sugerencia).toBe("Revisa que las palabras clave vayan en orden: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.");
    expect(error.original).toMatch(/^Parse error on line 1/);
  });

  it("los mensajes propios pasan tal cual", () => {
    expect(explicarErrorSql("", "Escribe una consulta antes de ejecutar.", tablas)).toEqual({
      mensaje: "Escribe una consulta antes de ejecutar.",
      sugerencia: null,
      linea: null,
      original: "Escribe una consulta antes de ejecutar.",
    });
  });

  it("un error desconocido conserva el original", () => {
    expect(explicarErrorSql("SELECT 1", "algo raro", tablas)).toEqual({
      mensaje: "La consulta no se pudo ejecutar.",
      sugerencia: "Revisa la consulta por partes: primero SELECT y FROM, y después agrega lo demás.",
      linea: null,
      original: "algo raro",
    });
  });
});

describe("avisosSql", () => {
  it("columna mal escrita", () => {
    expect(avisosSql("SELECT nombres FROM clientes", tablas)).toEqual([
      { mensaje: "No existe la columna «nombres» en las tablas de esta consulta. ¿Quisiste decir «nombre»?", linea: 1 },
    ]);
  });

  it("no avisa por los nombres de un WITH ni por el alias de una subconsulta en FROM", () => {
    const conWith = "WITH resumen AS (SELECT cliente_id, SUM(monto) AS total FROM ventas GROUP BY cliente_id)\nSELECT c.nombre, r.total FROM resumen AS r JOIN clientes AS c ON c.id = r.cliente_id";
    expect(avisosSql(conWith, tablas)).toEqual([]);
    expect(avisosSql("WITH resumen AS (SELECT cliente_id FROM ventas) SELECT cliente_id FROM resumen", tablas)).toEqual([]);
    expect(avisosSql("SELECT r.total FROM (SELECT cliente_id, SUM(monto) AS total FROM ventas GROUP BY cliente_id) AS r WHERE r.total > 100000", tablas)).toEqual([]);
    // Un alias de columna después de un paréntesis sigue siendo un alias de columna, no una tabla.
    expect(avisosSql("SELECT ROUND(AVG(monto), 2) AS promedio FROM ventas WHERE promedio.x > 1", tablas)).toEqual([
      { mensaje: "«promedio» no es una tabla ni un alias de esta consulta.", linea: 1 },
    ]);
  });

  it("avisa que MIN y MAX no funcionan con texto en este editor, y propone ORDER BY", () => {
    expect(avisosSql("SELECT MIN(nombre) AS primero FROM clientes", tablas)).toEqual([
      {
        mensaje: "En este editor, MIN y MAX solo funcionan con números: con la columna de texto «nombre» dan NULL. Para el primero o el último, ordena con ORDER BY nombre y toma una fila con LIMIT 1.",
        linea: 1,
      },
    ]);
    expect(avisosSql("SELECT MAX(monto) FROM ventas", tablas)).toEqual([]);
  });

  it("columna con otras mayúsculas", () => {
    expect(avisosSql("SELECT NOMBRE FROM clientes", tablas)).toEqual([
      { mensaje: "Las columnas distinguen mayúsculas y minúsculas: escribe «nombre» en vez de «NOMBRE».", linea: 1 },
    ]);
  });

  it("texto sin comillas que aparece en los datos", () => {
    expect(avisosSql("SELECT nombre FROM clientes\nWHERE ciudad = Santiago", tablas)).toEqual([
      { mensaje: "«Santiago» parece un texto: escríbelo entre comillas simples, 'Santiago'.", linea: 2 },
    ]);
  });

  it("columna que no es de la tabla indicada antes del punto", () => {
    expect(avisosSql("SELECT c.monto FROM clientes c", tablas)).toEqual([
      { mensaje: "La tabla clientes no tiene la columna «monto».", linea: 1 },
    ]);
  });

  it("calificador que no es tabla ni alias", () => {
    expect(avisosSql("SELECT x.nombre FROM clientes c", tablas)).toEqual([
      { mensaje: "«x» no es una tabla ni un alias de esta consulta.", linea: 1 },
    ]);
  });

  it("no da avisos falsos con alias, textos, comentarios, funciones y minúsculas", () => {
    const consulta = [
      "select c.nombre, SUM(v.monto) AS total -- nombres de clientes",
      "FROM clientes c JOIN ventas v ON v.cliente_id = c.id",
      "WHERE c.ciudad <> 'Santiago centro' /* otra ciudad */",
      "GROUP BY c.nombre ORDER BY total DESC LIMIT 5",
    ].join("\n");
    expect(avisosSql(consulta, tablas)).toEqual([]);
    expect(avisosSql("SELECT ciudad, COUNT(*) AS cantidad FROM clientes AS cl GROUP BY ciudad HAVING COUNT(*) > 1", tablas)).toEqual([]);
    expect(avisosSql("SELECT DISTINCT ciudad FROM clientes WHERE nombre LIKE 'A%' OR id IN (1, 2)", tablas)).toEqual([]);
  });

  it("no repite el mismo aviso", () => {
    expect(avisosSql("SELECT nombres FROM clientes ORDER BY nombres", tablas)).toHaveLength(1);
  });
});
