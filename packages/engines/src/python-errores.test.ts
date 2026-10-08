import { describe, expect, it } from "vitest";
import { explicarErrorPython } from "./python-errores";

// Tracebacks con la forma real de Pyodide 0.28.3: primero el marco de Pyodide, luego el código (<exec>).
function traza(...lineas: string[]): string {
  return ["Traceback (most recent call last):", '  File "/lib/python313.zip/_pyodide/_base.py", line 597, in eval_code_async', ...lineas, ""].join("\n");
}
const enLinea = (n: number) => `  File "<exec>", line ${n}, in <module>`;
const COLUMNAS = ["id", "cliente_id", "fecha", "monto"];

describe("explicarErrorPython", () => {
  it("NameError con la sugerencia de Python", () => {
    expect(explicarErrorPython(traza(enLinea(2), "NameError: name 'venta' is not defined. Did you mean: 'ventas'?"))).toEqual({
      mensaje: "No existe nada llamado «venta».",
      sugerencia: "¿Quisiste decir «ventas»?",
      linea: 2,
      original: "NameError: name 'venta' is not defined. Did you mean: 'ventas'?",
    });
  });

  it("NameError sin sugerencia", () => {
    expect(explicarErrorPython(traza(enLinea(1), "NameError: name 'xyz' is not defined")).sugerencia).toBe(
      "Revisa que lo hayas creado antes de usarlo y que esté bien escrito: Python distingue mayúsculas y minúsculas."
    );
  });

  it("KeyError dentro de pandas: marca la línea de la persona y sugiere la columna", () => {
    const traceback = traza(
      enLinea(3),
      '  File "/lib/python3.13/site-packages/pandas/core/frame.py", line 4102, in __getitem__',
      '  File "/lib/python3.13/site-packages/pandas/core/indexes/base.py", line 3819, in get_loc',
      "    raise KeyError(key) from err",
      "KeyError: 'montos'"
    );
    expect(explicarErrorPython(traceback, { columnas: COLUMNAS })).toEqual({
      mensaje: "No existe la columna o clave «montos».",
      sugerencia: "¿Quisiste decir «monto»?",
      linea: 3,
      original: "KeyError: 'montos'",
    });
    expect(explicarErrorPython(traza(enLinea(1), "KeyError: 'precio'"), { columnas: COLUMNAS }).sugerencia).toBe(
      "Las columnas de los datos del caso son: id, cliente_id, fecha, monto."
    );
  });

  it("dentro de una función marca la línea donde ocurrió", () => {
    const traceback = traza(enLinea(4), '  File "<exec>", line 2, in promedio', "ZeroDivisionError: division by zero");
    expect(explicarErrorPython(traceback)).toEqual({
      mensaje: "Estás dividiendo por cero.",
      sugerencia: "Revisa que el divisor no valga 0 antes de dividir.",
      linea: 2,
      original: "ZeroDivisionError: division by zero",
    });
  });

  it("errores de sintaxis", () => {
    const sintaxis = (detalle: string) => explicarErrorPython(traza('  File "<exec>", line 2', "    print(a +", "         ^", `SyntaxError: ${detalle}`));
    expect(sintaxis("'(' was never closed")).toMatchObject({ mensaje: "Abriste «(» y nunca lo cerraste.", sugerencia: "Agrega el «)» que falta.", linea: 2 });
    expect(sintaxis("'[' was never closed").sugerencia).toBe("Agrega el «]» que falta.");
    expect(sintaxis("unmatched ')'").mensaje).toBe("Sobra un «)» que no tiene pareja.");
    expect(sintaxis("unterminated string literal (detected at line 2)").mensaje).toBe("Hay un texto sin la comilla de cierre.");
    expect(sintaxis("expected ':'").mensaje).toBe("Falta «:» al final de la línea.");
    expect(sintaxis("invalid syntax. Maybe you meant '==' or ':=' instead of '='?").mensaje).toBe("Para comparar se usa «==»; «=» es para guardar un valor.");
    expect(sintaxis("invalid syntax. Perhaps you forgot a comma?").sugerencia).toBe("¿Te falta una coma entre dos elementos?");
    expect(sintaxis("invalid syntax")).toMatchObject({
      mensaje: "Python no entiende esta línea.",
      sugerencia: "Revisa paréntesis, comillas, comas y los dos puntos al final de if, for y def.",
    });
  });

  it("errores de sangría", () => {
    const sangria = (detalle: string) => explicarErrorPython(traza('  File "<exec>", line 2', `IndentationError: ${detalle}`));
    expect(sangria("expected an indented block after 'if' statement on line 1")).toMatchObject({
      mensaje: "Después de la línea con «if» falta un bloque con sangría.",
      sugerencia: "Deja 4 espacios al inicio de las líneas que van dentro del if.",
      linea: 2,
    });
    expect(sangria("expected an indented block after function definition on line 1").mensaje).toBe("Después de la línea con «def» falta un bloque con sangría.");
    expect(sangria("unexpected indent").mensaje).toBe("Esta línea tiene una sangría que no corresponde.");
    expect(sangria("unindent does not match any outer indentation level").mensaje).toBe("La sangría de esta línea no coincide con las anteriores.");
  });

  it("AttributeError: nombra el tipo en español y aprovecha la sugerencia", () => {
    expect(explicarErrorPython(traza(enLinea(1), "AttributeError: 'DataFrame' object has no attribute 'grupby'. Did you mean: 'groupby'?"))).toMatchObject({
      mensaje: "Un DataFrame no tiene nada llamado «grupby».",
      sugerencia: "¿Quisiste decir «groupby»?",
    });
    expect(explicarErrorPython(traza(enLinea(1), "AttributeError: 'NoneType' object has no attribute 'mean'"))).toMatchObject({
      mensaje: "Intentaste usar «.mean» sobre None (un valor vacío).",
      sugerencia: "Revisa la línea donde le diste valor a esa variable: quizás una función no devolvió nada.",
    });
  });

  it("TypeError", () => {
    expect(explicarErrorPython(traza(enLinea(1), 'TypeError: can only concatenate str (not "int") to str'))).toMatchObject({
      mensaje: "No puedes unir un texto con un número usando «+».",
      sugerencia: 'Convierte el número con str(...) o usa un f-string: f"Total: {total}".',
    });
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: unsupported operand type(s) for +: 'int' and 'str'")).mensaje).toBe(
      "No se puede usar «+» entre un número entero (int) y un texto (str)."
    );
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: 'int' object is not callable")).mensaje).toBe(
      "Un número entero (int) no es una función: no lleva paréntesis después."
    );
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: f() takes 1 positional argument but 2 were given")).mensaje).toBe(
      "«f» recibe 1 valor, pero le pasaste 2."
    );
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: grupo_edad() missing 1 required positional argument: 'edad'"))).toMatchObject({
      mensaje: "Llamaste a «grupo_edad» sin el valor de «edad».",
      sugerencia: "Pasa un valor por cada parámetro entre los paréntesis. Si se la estás dando a apply, va sin paréntesis: apply(grupo_edad).",
    });
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: total() missing 2 required positional arguments: 'precio' and 'cantidad'")).mensaje).toBe(
      "Llamaste a «total» sin el valor de «precio» y «cantidad»."
    );
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: unhashable type: 'list'")).mensaje).toBe(
      "Estás combinando tipos de datos o argumentos que no son compatibles."
    );
  });

  it("los errores típicos de pandas al combinar condiciones", () => {
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: Cannot perform 'rand_' with a dtyped [object] array and scalar of type [bool]"))).toMatchObject({
      mensaje: "Combinaste condiciones con & o | sin paréntesis.",
      sugerencia: 'Pon cada condición entre paréntesis: (tabla["cantidad"] >= 3) & (tabla["estado"] == "entregado").',
    });
    expect(explicarErrorPython(traza(enLinea(1), "ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all()."))).toMatchObject({
      mensaje: "Usaste and, or o un if con una columna completa.",
    });
  });

  it("archivo, módulo, posición y conversión", () => {
    expect(explicarErrorPython(traza(enLinea(1), "FileNotFoundError: [Errno 44] No such file or directory: 'datos/venta.csv'"), { archivos: ["datos/clientes.csv", "datos/ventas.csv"] })).toMatchObject({
      mensaje: "No existe el archivo «datos/venta.csv».",
      sugerencia: "¿Quisiste decir «datos/ventas.csv»?",
    });
    expect(explicarErrorPython(traza(enLinea(1), "ModuleNotFoundError: No module named 'panda'"))).toMatchObject({
      mensaje: "No existe el módulo «panda».",
      sugerencia: "¿Quisiste decir «pandas»?",
    });
    expect(explicarErrorPython(traza(enLinea(1), "IndexError: list index out of range")).mensaje).toBe("Pediste una posición que no existe.");
    expect(explicarErrorPython(traza(enLinea(1), "IndexError: single positional indexer is out-of-bounds")).mensaje).toBe("Pediste con iloc una posición que no existe.");
    expect(explicarErrorPython(traza(enLinea(1), "ValueError: invalid literal for int() with base 10: 'abc'")).mensaje).toBe("No se puede convertir «abc» en un número entero.");
    expect(explicarErrorPython(traza(enLinea(1), "ValueError: could not convert string to float: '3,5'"))).toMatchObject({
      mensaje: "No se puede convertir «3,5» en un número decimal.",
      sugerencia: "float() usa punto decimal: '3.5', no '3,5'.",
    });
  });

  it("un error desconocido o sin línea conserva el original", () => {
    expect(explicarErrorPython(traza(enLinea(5), "RecursionError: maximum recursion depth exceeded"))).toEqual({
      mensaje: "Tu código se detuvo por un error.",
      sugerencia: "Lee el mensaje original: la última línea dice qué tipo de error ocurrió.",
      linea: 5,
      original: "RecursionError: maximum recursion depth exceeded",
    });
    expect(explicarErrorPython("MemoryError").linea).toBeNull();
  });
});
