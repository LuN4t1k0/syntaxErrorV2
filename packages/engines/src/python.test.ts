import { readFileSync } from "node:fs";
import { loadPyodide } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import { columnasDeArchivos, crearSesionPython, PYODIDE_VERSION, quitarArchivos, type PyodideLike, type SesionPython, type TareaPython } from "./python";

let sesion: SesionPython;
let py: PyodideLike;

beforeAll(async () => {
  py = (await loadPyodide()) as unknown as PyodideLike;
  sesion = await crearSesionPython(py, {
    paquetes: [],
    archivos: [{ ruta: "datos/ventas.csv", contenido: "id,monto\n1,100\n2,250\n" }],
  });
}, 120_000);

const totalTarea: TareaPython = {
  preparacion: "precio = 450000\nstock = 3",
  pruebas: 'assert total == 1350000, "total debe ser el precio por el stock"',
};

describe("crearSesionPython", () => {
  it("la versión del CDN coincide con la de pyodide instalada", () => {
    const paquete = JSON.parse(
      readFileSync(new URL("../node_modules/pyodide/package.json", import.meta.url), "utf8")
    ) as { version: string };
    expect(paquete.version).toBe(PYODIDE_VERSION);
  });

  it("ejecutar devuelve las variables que quedaron, con su tipo y su valor, aunque no se imprima nada", async () => {
    const codigo = 'import math\nproducto = "Notebook"\nprecio = 450000\ndisponible = True\ndescuento = 0.1\ndef total(p):\n    return p\nlargo = "x" * 200';
    const resultado = await sesion.ejecutar("stock = 3", codigo);
    expect(resultado).toMatchObject({ ok: true, salida: "" });
    expect(resultado.ok && resultado.variables).toEqual([
      { nombre: "stock", tipo: "int", valor: "3" },
      { nombre: "producto", tipo: "str", valor: "'Notebook'" },
      { nombre: "precio", tipo: "int", valor: "450000" },
      { nombre: "disponible", tipo: "bool", valor: "True" },
      { nombre: "descuento", tipo: "float", valor: "0.1" },
      { nombre: "total", tipo: "function", valor: "función total" },
      { nombre: "largo", tipo: "str", valor: `'${"x".repeat(76)}…` },
    ]);
  });

  it("ejecutar devuelve lo impreso", async () => {
    expect(await sesion.ejecutar("", 'print("hola")')).toEqual({ ok: true, salida: "hola", tablas: [], variables: [] });
  });

  it("deja los archivos del caso disponibles con ruta relativa", async () => {
    const resultado = await sesion.ejecutar("", 'print(open("datos/ventas.csv").read().splitlines()[1])');
    expect(resultado).toEqual({ ok: true, salida: "1,100", tablas: [], variables: [] });
  });

  it("aprueba cuando pasan las pruebas", async () => {
    expect(await sesion.revisar(totalTarea, "total = precio * stock")).toEqual({
      aprobada: true,
      diagnostico: null,
      salida: "",
    });
  });

  it("muestra el mensaje del assert que falla", async () => {
    const resultado = await sesion.revisar(totalTarea, "total = precio + stock");
    expect(resultado.diagnostico).toBe("total debe ser el precio por el stock");
  });

  it("las pruebas ven lo impreso en _salida, también con comillas y saltos de línea", async () => {
    const tarea: TareaPython = { preparacion: 'nombre = "Ana"', pruebas: 'assert _salida == \'Hola, "Ana"\\nchao\', "No imprimiste el saludo."' };
    expect((await sesion.revisar(tarea, 'print(f\'Hola, "{nombre}"\')\nprint("chao")')).aprobada).toBe(true);
    const fallida = await sesion.revisar(tarea, 'saludo = "Hola"');
    expect(fallida.diagnostico).toBe("No imprimiste el saludo.");
  });

  it("las pruebas pueden volver a ejecutar el código de la persona con otros valores, desde _codigo", async () => {
    const tarea: TareaPython = {
      preparacion: "stock = 3",
      pruebas: 'for s, e in [(3, "Reponer"), (12, "OK")]:\n    v = {"stock": s}\n    exec(_codigo, v)\n    assert v["estado"] == e, f"Con stock {s}, estado no es correcto."',
    };
    expect((await sesion.revisar(tarea, 'if stock < 5:\n    estado = "Reponer"\nelse:\n    estado = "OK"')).aprobada).toBe(true);
    expect((await sesion.revisar(tarea, 'estado = "Reponer"')).diagnostico).toBe("Con stock 12, estado no es correcto.");
  });

  it("si se guardó lo que devuelve print, explica que print no guarda el valor", async () => {
    const resultado = await sesion.revisar(totalTarea, "total = print(precio * stock)");
    expect(resultado.salida).toBe("1350000");
    expect(resultado.diagnostico).toBe(
      "print muestra el valor en la salida, pero no lo guarda: «total» quedó en None. Asígnale el valor sin print, por ejemplo: total = precio * stock"
    );
    expect(resultado.errorDeCodigo).toBeUndefined();
  });

  it("da un mensaje genérico si el assert no tiene mensaje", async () => {
    const resultado = await sesion.revisar({ preparacion: "", pruebas: "assert total == 1" }, "total = 2");
    expect(resultado.diagnostico).toBe("Una prueba no pasó. Revisa el resultado de tu código.");
    expect(resultado.errorDeCodigo).toBeUndefined();
  });

  it("informa el error de sintaxis del alumno, explicado", async () => {
    const resultado = await sesion.revisar(totalTarea, "total = (");
    expect(resultado.diagnostico).toBe("Tu código tiene un error. Línea 1: Abriste «(» y nunca lo cerraste. Agrega el «)» que falta.");
    expect(resultado.errorDeCodigo).toBe(true);
  });

  it("no arrastra variables de una ejecución anterior", async () => {
    await sesion.ejecutar("", "total = 1350000");
    const resultado = await sesion.revisar(totalTarea, "x = 1");
    expect(resultado.diagnostico).toBe("Falta crear «total». Revisa que exista y que el nombre esté escrito igual que en el enunciado.");
  });

  it("ejecutar explica el error con la línea del editor, aunque haya preparación", async () => {
    expect(await sesion.ejecutar("ventas = 1\notra = 2", "x = 2\nprint(venta)")).toEqual({
      ok: false,
      salida: "",
      error: {
        mensaje: "No existe nada llamado «venta».",
        sugerencia: "¿Quisiste decir «ventas»?",
        linea: 2,
        original: "NameError: name 'venta' is not defined. Did you mean: 'ventas'?",
      },
    });
  });

  it("sugiere columnas y archivos del caso", async () => {
    const clave = await sesion.ejecutar("", 'fila = {"monto": 1}\nfila["montos"]');
    expect(clave).toMatchObject({ ok: false, error: { mensaje: "No existe la columna o clave «montos».", sugerencia: "¿Quisiste decir «monto»?", linea: 2 } });
    const archivo = await sesion.ejecutar("", 'open("datos/venta.csv")');
    expect(archivo).toMatchObject({ ok: false, error: { mensaje: "No existe el archivo «datos/venta.csv».", sugerencia: "¿Quisiste decir «datos/ventas.csv»?", linea: 1 } });
  });

  it("conserva lo impreso antes del error", async () => {
    expect(await sesion.ejecutar("", 'print("antes")\n1 / 0')).toMatchObject({ ok: false, salida: "antes", error: { linea: 2 } });
  });
});

describe("columnasDeArchivos", () => {
  it("lee los encabezados separados por punto y coma", () => {
    expect(columnasDeArchivos([{ ruta: "datos/matricula.csv", contenido: "agno;comuna;matricula\n2024;Talca;14.918\n" }])).toEqual(["agno", "comuna", "matricula"]);
  });

  it("lee los encabezados de los CSV sin repetir y sin comillas", () => {
    expect(
      columnasDeArchivos([
        { ruta: "datos/ventas.csv", contenido: "id,cliente_id,monto\n1,1,100\n" },
        { ruta: "datos/clientes.csv", contenido: '"id","nombre"\r\n1,Ana\r\n' },
        { ruta: "datos/notas.txt", contenido: "no,es,csv" },
      ])
    ).toEqual(["id", "cliente_id", "monto", "nombre"]);
  });
});

describe("tablas de pandas", () => {
  let conPandas: SesionPython;
  const preparacion = 'import pandas as pd\nventas = pd.read_csv("datos/ventas.csv")';

  beforeAll(async () => {
    const py = await loadPyodide();
    conPandas = await crearSesionPython(py, {
      paquetes: ["pandas"],
      archivos: [{ ruta: "datos/ventas.csv", contenido: "id,ciudad,fecha,monto\n1,Temuco,2025-03-01,100\n2,Santiago,2025-03-02,250\n3,Temuco,2025-03-03,\n" }],
    });
  }, 180_000);

  it("muestra los DataFrame y Series en variables, en orden, con el índice del groupby como columna", async () => {
    const resultado = await conPandas.ejecutar(preparacion, 'por_ciudad = ventas.groupby("ciudad")["monto"].sum()\ntotal = 350');
    expect(resultado).toEqual({
      ok: true,
      salida: "",
      tablas: [
        { nombre: "ventas", columnas: ["id", "ciudad", "fecha", "monto"], filas: [[1, "Temuco", "2025-03-01", 100], [2, "Santiago", "2025-03-02", 250], [3, "Temuco", "2025-03-03", null]], total: 3 },
        { nombre: "por_ciudad", columnas: ["ciudad", "monto"], filas: [["Santiago", 250], ["Temuco", 100]], total: 2 },
      ],
      // El módulo pd y las tablas de pandas no se repiten como variables.
      variables: [{ nombre: "total", tipo: "int", valor: "350" }],
    });
  });

  it("muestra solo las primeras filas pero informa el total, y nombra las Series sin nombre", async () => {
    const resultado = await conPandas.ejecutar(preparacion, 'grande = pd.DataFrame({"n": range(25)})\ndobles = pd.Series([1, 2]) * 2');
    if (!resultado.ok) throw new Error(resultado.error.original);
    const grande = resultado.tablas.find((tabla) => tabla.nombre === "grande");
    expect(grande?.filas).toHaveLength(10);
    expect(grande?.total).toBe(25);
    expect(resultado.tablas.find((tabla) => tabla.nombre === "dobles")).toEqual({ nombre: "dobles", columnas: ["dobles"], filas: [[2], [4]], total: 2 });
  });

  it("convierte fechas a texto y omite la tabla que no se puede mostrar", async () => {
    const codigo = [
      'fechas = pd.to_datetime(ventas["fecha"])',
      'raro = ventas.set_index("ciudad", drop=False)',
    ].join("\n");
    const resultado = await conPandas.ejecutar(preparacion, codigo);
    if (!resultado.ok) throw new Error(resultado.error.original);
    expect(resultado.tablas.map((tabla) => tabla.nombre)).toEqual(["ventas", "fechas"]);
    expect(String(resultado.tablas[1].filas[0][0])).toMatch(/^2025-03-01/);
  });

  it("no muestra más de 5 tablas", async () => {
    const codigo = Array.from({ length: 7 }, (_, i) => `t${i} = ventas.head(1)`).join("\n");
    const resultado = await conPandas.ejecutar(preparacion, codigo);
    expect(resultado.ok && resultado.tablas.length).toBe(5);
  });

  it("al fallar, explica el error con las columnas del caso y no trae tablas", async () => {
    const resultado = await conPandas.ejecutar(preparacion, 'x = 1\ny = ventas["montos"]');
    expect(resultado).toMatchObject({ ok: false, error: { mensaje: "No existe la columna o clave «montos».", sugerencia: "¿Quisiste decir «monto»?", linea: 2 } });
    expect(resultado).not.toHaveProperty("tablas");
  });
});

describe("quitarArchivos", () => {
  it("borra los archivos de otro caso, para que no queden al cambiar de lección", async () => {
    const otra = await crearSesionPython(py, { paquetes: [], archivos: [{ ruta: "datos/clientes.csv", contenido: "id\n7\n" }] });
    expect(await otra.ejecutar("", 'print(open("datos/clientes.csv").read().strip())')).toMatchObject({ ok: true, salida: "id\n7" });
    quitarArchivos(py, ["datos/clientes.csv", "datos/no-existe.csv"]);
    const resultado = await otra.ejecutar("", 'open("datos/clientes.csv")');
    expect(resultado.ok).toBe(false);
  });
});
