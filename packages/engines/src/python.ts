import { textoDeError, type ErrorExplicado } from "./consola";
import { explicarErrorPython, type ContextoPython } from "./python-errores";
import type { ResultadoTarea } from "./tipos";

export const PYODIDE_VERSION = "0.28.3";
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const DIRECTORIO_TRABAJO = "/home/pyodide";

export type Archivo = { ruta: string; contenido: string };
export type OpcionesPython = { paquetes: string[]; archivos: Archivo[] };
export type TablaVisible = { nombre: string; columnas: string[]; filas: unknown[][]; total: number };
// Una variable que quedó después de ejecutar, para mostrarla aunque el código no imprima nada.
export type VariableVisible = { nombre: string; tipo: string; valor: string };
export type ResultadoEjecucion = { ok: true; salida: string; tablas: TablaVisible[]; variables: VariableVisible[] } | { ok: false; error: ErrorExplicado; salida: string };

export const MAX_TABLAS = 5;
export const FILAS_POR_TABLA = 10;
export const MAX_VARIABLES = 20;
const LARGO_VALOR = 80;
export type ResultadoRevision = ResultadoTarea & { salida: string };
export type TareaPython = { preparacion: string; pruebas: string };

export type PyodideLike = {
  runPythonAsync(codigo: string): Promise<unknown>;
  loadPackage(nombres: string[]): Promise<unknown>;
  setStdout(opciones: { batched: (texto: string) => void }): void;
  // unlink existe en Pyodide, pero sus tipos no lo declaran.
  FS: { mkdirTree(ruta: string): void; writeFile(ruta: string, datos: string): void; unlink?(ruta: string): void };
};

export type SesionPython = {
  ejecutar(preparacion: string, codigo: string): Promise<ResultadoEjecucion>;
  revisar(tarea: TareaPython, codigo: string): Promise<ResultadoRevision>;
};

const LIMPIAR_VARIABLES = `
for _nombre in list(globals().keys()):
    if not _nombre.startswith("_"):
        del globals()[_nombre]
`;

// Corre después del código de la persona. Empieza con _ para que LIMPIAR_VARIABLES no la borre ni se muestre.
const TABLAS_VISIBLES = `
def _tablas_visibles():
    import json, sys
    pd = sys.modules.get("pandas")
    if pd is None:
        return "[]"
    tablas = []
    for nombre, valor in list(globals().items()):
        if nombre.startswith("_") or len(tablas) >= ${MAX_TABLAS}:
            continue
        try:
            if isinstance(valor, pd.Series):
                valor = valor.to_frame(name=valor.name if valor.name is not None else nombre)
            if not isinstance(valor, pd.DataFrame):
                continue
            muestra = valor.head(${FILAS_POR_TABLA})
            if not isinstance(muestra.index, pd.RangeIndex):
                muestra = muestra.reset_index()
            filas = json.loads(muestra.to_json(orient="values", date_format="iso", default_handler=str))
            tablas.append({"nombre": nombre, "columnas": [str(c) for c in muestra.columns], "filas": filas, "total": int(len(valor))})
        except Exception:
            continue
    return json.dumps(tablas)
_tablas_visibles()
`;

// Las variables simples que dejó el código: las tablas de pandas van en TABLAS_VISIBLES, y los módulos importados no se
// muestran. Sin esto, «Ejecutar» sobre un código que solo crea variables parecía no hacer nada.
const VARIABLES_VISIBLES = `
def _variables_visibles():
    import json, types
    visibles = []
    for nombre, valor in list(globals().items()):
        if nombre.startswith("_") or len(visibles) >= ${MAX_VARIABLES}:
            continue
        if isinstance(valor, (types.ModuleType, type)):
            continue
        tipo = type(valor).__name__
        if tipo in ("DataFrame", "Series"):
            continue
        if isinstance(valor, types.FunctionType):
            texto = "función " + nombre
            tipo = "function"
        else:
            texto = repr(valor)
            if len(texto) > ${LARGO_VALOR}:
                texto = texto[:${LARGO_VALOR - 3}] + "…"
        visibles.append({"nombre": nombre, "tipo": tipo, "valor": texto})
    return json.dumps(visibles, ensure_ascii=False)
_variables_visibles()
`;

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ultimaLinea(traceback: string): string {
  return traceback.split("\n").map((linea) => linea.trim()).filter(Boolean).at(-1) ?? traceback;
}

export function columnasDeArchivos(archivos: Archivo[]): string[] {
  const columnas = archivos
    .filter((archivo) => archivo.ruta.endsWith(".csv"))
    // Los archivos de portales públicos suelen separar con punto y coma.
    .flatMap((archivo) => (archivo.contenido.split(/\r?\n/, 1)[0] ?? "").split(/[,;]/))
    .map((columna) => columna.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
  return [...new Set(columnas)];
}

function diagnosticoDePrueba(traceback: string, contexto: ContextoPython): string {
  const linea = ultimaLinea(traceback);
  if (linea.startsWith("AssertionError")) {
    const mensaje = linea.slice("AssertionError".length).replace(/^:\s*/, "");
    return mensaje || "Una prueba no pasó. Revisa el resultado de tu código.";
  }
  const nombre = /^NameError: name '([^']+)' is not defined/.exec(linea)?.[1];
  if (nombre) return `Falta crear «${nombre}». Revisa que exista y que el nombre esté escrito igual que en el enunciado.`;
  return `Falta algo: ${explicarErrorPython(traceback, contexto).mensaje}`;
}

// «resultado = print(...)» muestra el valor correcto en la salida, pero guarda None: sin este aviso la prueba solo dice
// que el valor no es el esperado y la persona ve en pantalla justo lo que se le pidió.
function diagnosticoDePrint(codigo: string): string | null {
  const asignacion = /^[ \t]*([A-Za-z_]\w*)[ \t]*=[ \t]*print[ \t]*\((.*)\)[ \t]*$/m.exec(codigo);
  if (!asignacion) return null;
  const [, nombre, argumento] = asignacion;
  const mensaje = `print muestra el valor en la salida, pero no lo guarda: «${nombre}» quedó en None.`;
  // Con varios argumentos (o sep=, end=) no hay un solo valor que sugerir.
  return argumento.trim() && !argumento.includes(",") ? `${mensaje} Asígnale el valor sin print, por ejemplo: ${nombre} = ${argumento.trim()}` : `${mensaje} Asígnale el valor sin print.`;
}

// Borra archivos de una sesión anterior (de otro caso), cuando el mismo Python se reutiliza al cambiar de lección.
export function quitarArchivos(py: PyodideLike, rutas: string[]): void {
  for (const ruta of rutas) {
    try {
      py.FS.unlink?.(`${DIRECTORIO_TRABAJO}/${ruta}`);
    } catch {
      // Ya no estaba.
    }
  }
}

export async function crearSesionPython(py: PyodideLike, opciones: OpcionesPython): Promise<SesionPython> {
  if (opciones.paquetes.length > 0) await py.loadPackage(opciones.paquetes);
  for (const archivo of opciones.archivos) {
    const ruta = `${DIRECTORIO_TRABAJO}/${archivo.ruta}`;
    py.FS.mkdirTree(ruta.slice(0, ruta.lastIndexOf("/")));
    py.FS.writeFile(ruta, archivo.contenido);
  }

  const contexto: ContextoPython = {
    columnas: columnasDeArchivos(opciones.archivos),
    archivos: opciones.archivos.map((archivo) => archivo.ruta),
  };

  let lineas: string[] = [];
  py.setStdout({ batched: (texto) => lineas.push(texto) });
  const tomarSalida = () => {
    const salida = lineas.join("\n");
    lineas = [];
    return salida;
  };

  async function correr(preparacion: string, codigo: string, conTablas: boolean): Promise<ResultadoEjecucion> {
    await py.runPythonAsync(LIMPIAR_VARIABLES);
    tomarSalida();
    if (preparacion.trim()) await py.runPythonAsync(preparacion);
    try {
      await py.runPythonAsync(codigo);
    } catch (error) {
      return { ok: false, error: explicarErrorPython(mensajeDe(error), contexto), salida: tomarSalida() };
    }
    const salida = tomarSalida();
    let tablas: TablaVisible[] = [];
    let variables: VariableVisible[] = [];
    if (conTablas) {
      try {
        tablas = JSON.parse(String(await py.runPythonAsync(TABLAS_VISIBLES))) as TablaVisible[];
      } catch {
        tablas = [];
      }
      try {
        variables = JSON.parse(String(await py.runPythonAsync(VARIABLES_VISIBLES))) as VariableVisible[];
      } catch {
        variables = [];
      }
    }
    return { ok: true, salida, tablas, variables };
  }

  return {
    ejecutar: (preparacion, codigo) => correr(preparacion, codigo, true),
    async revisar(tarea, codigo) {
      const resultado = await correr(tarea.preparacion, codigo, false);
      if (!resultado.ok) {
        return { aprobada: false, diagnostico: `Tu código tiene un error. ${textoDeError(resultado.error)}`, salida: resultado.salida, errorDeCodigo: true };
      }
      try {
        // Lo impreso queda en _salida y el código de la persona en _codigo: así una tarea puede pedir print(...), y las
        // pruebas pueden volver a ejecutar el código con otros valores (un if que siempre da lo mismo no aprueba).
        // Van como JSON dentro de un literal de texto, que se lee igual en JavaScript y en Python.
        const texto = (valor: string) => `_json.loads(${JSON.stringify(JSON.stringify(valor))})`;
        await py.runPythonAsync(`import json as _json\n_salida = ${texto(resultado.salida)}\n_codigo = ${texto(codigo)}`);
        await py.runPythonAsync(tarea.pruebas);
      } catch (error) {
        return { aprobada: false, diagnostico: diagnosticoDePrint(codigo) ?? diagnosticoDePrueba(mensajeDe(error), contexto), salida: resultado.salida };
      }
      return { aprobada: true, diagnostico: null, salida: resultado.salida };
    },
  };
}
