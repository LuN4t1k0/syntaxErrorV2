import { crearSesionPython, PYODIDE_CDN, quitarArchivos, type PyodideLike, type SesionPython } from "@syntaxerror/engines/python";
import type { MensajeWorker, RespuestaWorker } from "@syntaxerror/engines/python-cliente";

type AmbitoWorker = { onmessage: ((evento: MessageEvent<MensajeWorker>) => void) | null; postMessage(respuesta: RespuestaWorker): void };

const ambito = self as unknown as AmbitoWorker;
let sesion: SesionPython | null = null;
// Pyodide se carga una vez por worker: al cambiar de lección, "iniciar" llega de nuevo con otras opciones y solo se
// cargan los paquetes que falten y se cambian los archivos.
let pyodide: Promise<PyodideLike> | null = null;
let archivosAnteriores: string[] = [];
// Los mensajes se atienden de a uno, para que dos "iniciar" seguidos no terminen en desorden.
let cola: Promise<unknown> = Promise.resolve();

async function cargarPyodide(): Promise<PyodideLike> {
  const modulo = (await import(/* webpackIgnore: true */ `${PYODIDE_CDN}pyodide.mjs`)) as { loadPyodide: (opciones: { indexURL: string }) => Promise<PyodideLike> };
  return modulo.loadPyodide({ indexURL: PYODIDE_CDN });
}

async function atender(mensaje: MensajeWorker): Promise<unknown> {
  if (mensaje.tipo === "iniciar") {
    pyodide ??= cargarPyodide();
    const py = await pyodide.catch((error: unknown) => {
      pyodide = null;
      throw error;
    });
    const rutas = mensaje.opciones.archivos.map((archivo) => archivo.ruta);
    quitarArchivos(py, archivosAnteriores.filter((ruta) => !rutas.includes(ruta)));
    sesion = await crearSesionPython(py, mensaje.opciones);
    archivosAnteriores = rutas;
    return null;
  }
  if (!sesion) throw new Error("Python no está iniciado.");
  if (mensaje.tipo === "ejecutar") return sesion.ejecutar(mensaje.preparacion, mensaje.codigo);
  return sesion.revisar({ preparacion: mensaje.preparacion, pruebas: mensaje.pruebas }, mensaje.codigo);
}

ambito.onmessage = (evento) => {
  const mensaje = evento.data;
  const turno = cola.then(() => atender(mensaje));
  cola = turno.catch(() => undefined);
  turno.then(
    (resultado) => ambito.postMessage({ id: mensaje.id, ok: true, resultado }),
    (error: unknown) => ambito.postMessage({ id: mensaje.id, ok: false, error: error instanceof Error ? error.message : String(error) })
  );
};
