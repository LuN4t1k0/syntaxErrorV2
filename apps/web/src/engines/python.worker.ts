import { crearSesionPython, PYODIDE_CDN, type PyodideLike, type SesionPython } from "@syntaxerror/engines/python";
import type { MensajeWorker, RespuestaWorker } from "@syntaxerror/engines/python-cliente";

type AmbitoWorker = { onmessage: ((evento: MessageEvent<MensajeWorker>) => void) | null; postMessage(respuesta: RespuestaWorker): void };

const ambito = self as unknown as AmbitoWorker;
let sesion: SesionPython | null = null;

async function cargarPyodide(): Promise<PyodideLike> {
  const modulo = (await import(/* webpackIgnore: true */ `${PYODIDE_CDN}pyodide.mjs`)) as { loadPyodide: (opciones: { indexURL: string }) => Promise<PyodideLike> };
  return modulo.loadPyodide({ indexURL: PYODIDE_CDN });
}

async function atender(mensaje: MensajeWorker): Promise<unknown> {
  if (mensaje.tipo === "iniciar") {
    sesion = await crearSesionPython(await cargarPyodide(), mensaje.opciones);
    return null;
  }
  if (!sesion) throw new Error("Python no está iniciado.");
  if (mensaje.tipo === "ejecutar") return sesion.ejecutar(mensaje.preparacion, mensaje.codigo);
  return sesion.revisar({ preparacion: mensaje.preparacion, pruebas: mensaje.pruebas }, mensaje.codigo);
}

ambito.onmessage = (evento) => {
  const mensaje = evento.data;
  atender(mensaje).then(
    (resultado) => ambito.postMessage({ id: mensaje.id, ok: true, resultado }),
    (error: unknown) => ambito.postMessage({ id: mensaje.id, ok: false, error: error instanceof Error ? error.message : String(error) })
  );
};
