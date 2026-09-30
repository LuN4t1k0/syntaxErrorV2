import type { ResultadoTarea } from "./tipos";

export const PYODIDE_VERSION = "0.28.3";
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const DIRECTORIO_TRABAJO = "/home/pyodide";

export type Archivo = { ruta: string; contenido: string };
export type OpcionesPython = { paquetes: string[]; archivos: Archivo[] };
export type ResultadoEjecucion = { ok: true; salida: string } | { ok: false; error: string; salida: string };
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

function ultimaLinea(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : String(error);
  const lineas = mensaje.split("\n").map((linea) => linea.trim()).filter(Boolean);
  return lineas.at(-1) ?? mensaje;
}

function diagnosticoDePrueba(linea: string): string {
  if (linea.startsWith("AssertionError")) {
    const mensaje = linea.slice("AssertionError".length).replace(/^:\s*/, "");
    return mensaje || "Una prueba no pasó. Revisa el resultado de tu código.";
  }
  return `Falta algo: ${linea}`;
}

export async function crearSesionPython(py: PyodideLike, opciones: OpcionesPython): Promise<SesionPython> {
  if (opciones.paquetes.length > 0) await py.loadPackage(opciones.paquetes);
  for (const archivo of opciones.archivos) {
    const ruta = `${DIRECTORIO_TRABAJO}/${archivo.ruta}`;
    py.FS.mkdirTree(ruta.slice(0, ruta.lastIndexOf("/")));
    py.FS.writeFile(ruta, archivo.contenido);
  }

  let lineas: string[] = [];
  py.setStdout({ batched: (texto) => lineas.push(texto) });
  const tomarSalida = () => {
    const salida = lineas.join("\n");
    lineas = [];
    return salida;
  };

  async function ejecutar(preparacion: string, codigo: string): Promise<ResultadoEjecucion> {
    await py.runPythonAsync(LIMPIAR_VARIABLES);
    tomarSalida();
    if (preparacion.trim()) await py.runPythonAsync(preparacion);
    try {
      await py.runPythonAsync(codigo);
    } catch (error) {
      return { ok: false, error: ultimaLinea(error), salida: tomarSalida() };
    }
    return { ok: true, salida: tomarSalida() };
  }

  return {
    ejecutar,
    async revisar(tarea, codigo) {
      const resultado = await ejecutar(tarea.preparacion, codigo);
      if (!resultado.ok) {
        return { aprobada: false, diagnostico: `Tu código tiene un error: ${resultado.error}`, salida: resultado.salida };
      }
      try {
        await py.runPythonAsync(tarea.pruebas);
      } catch (error) {
        return { aprobada: false, diagnostico: diagnosticoDePrueba(ultimaLinea(error)), salida: resultado.salida };
      }
      return { aprobada: true, diagnostico: null, salida: resultado.salida };
    },
  };
}
