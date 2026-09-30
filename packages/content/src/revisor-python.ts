import { loadPyodide } from "pyodide";
import { crearSesionPython, type PyodideLike } from "@syntaxerror/engines/python";
import { archivosPython } from "./datos";
import type { RevisorPython } from "./validar";

export function crearRevisorPythonNode(): RevisorPython {
  let pyodide: Promise<PyodideLike> | null = null;
  return async (tarea, caso) => {
    pyodide ??= loadPyodide() as unknown as Promise<PyodideLike>;
    const sesion = await crearSesionPython(await pyodide, { paquetes: tarea.paquetes, archivos: archivosPython(caso) });
    return sesion.revisar({ preparacion: tarea.preparacion, pruebas: tarea.pruebas }, tarea.solucion);
  };
}
