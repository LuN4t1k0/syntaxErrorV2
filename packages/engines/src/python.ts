import { textoDeError, type ErrorExplicado } from "./consola";
import { explicarErrorPython, type ContextoPython } from "./python-errores";
import type { ResultadoTarea } from "./tipos";

export const PYODIDE_VERSION = "0.28.3";
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const DIRECTORIO_TRABAJO = "/home/pyodide";

export type Archivo = { ruta: string; contenido: string };
export type OpcionesPython = { paquetes: string[]; archivos: Archivo[] };
export type TablaVisible = { nombre: string; columnas: string[]; filas: unknown[][]; total: number };
export type ResultadoEjecucion = { ok: true; salida: string; tablas: TablaVisible[] } | { ok: false; error: ErrorExplicado; salida: string };

export const MAX_TABLAS = 5;
export const FILAS_POR_TABLA = 10;
export type ResultadoRevision = ResultadoTarea & { salida: string };
export type TareaPython = { preparacion: string; pruebas: string };

export type PyodideLike = {
  runPythonAsync(codigo: string): Promise<unknown>;
  loadPackage(nombres: string[]): Promise<unknown>;
  setStdout(opciones: { batched: (texto: string) => void }): void;
  FS: { mkdirTree(ruta: string): void; writeFile(ruta: string, datos: string): void };
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
  if (nombre) return `Falta crear «${nombre}». Guarda el resultado con ese nombre exacto.`;
  return `Falta algo: ${explicarErrorPython(traceback, contexto).mensaje}`;
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
    if (conTablas) {
      try {
        tablas = JSON.parse(String(await py.runPythonAsync(TABLAS_VISIBLES))) as TablaVisible[];
      } catch {
        tablas = [];
      }
    }
    return { ok: true, salida, tablas };
  }

  return {
    ejecutar: (preparacion, codigo) => correr(preparacion, codigo, true),
    async revisar(tarea, codigo) {
      const resultado = await correr(tarea.preparacion, codigo, false);
      if (!resultado.ok) {
        return { aprobada: false, diagnostico: `Tu código tiene un error. ${textoDeError(resultado.error)}`, salida: resultado.salida, errorDeCodigo: true };
      }
      try {
        await py.runPythonAsync(tarea.pruebas);
      } catch (error) {
        return { aprobada: false, diagnostico: diagnosticoDePrueba(mensajeDe(error), contexto), salida: resultado.salida };
      }
      return { aprobada: true, diagnostico: null, salida: resultado.salida };
    },
  };
}
