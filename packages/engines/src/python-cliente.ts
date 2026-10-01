import { errorSimple } from "./consola";
import type { OpcionesPython, ResultadoEjecucion, ResultadoRevision, TareaPython } from "./python";

export type MensajeWorker =
  | { id: number; tipo: "iniciar"; opciones: OpcionesPython }
  | { id: number; tipo: "ejecutar"; preparacion: string; codigo: string }
  | { id: number; tipo: "revisar"; preparacion: string; pruebas: string; codigo: string };

export type RespuestaWorker = { id: number; ok: true; resultado: unknown } | { id: number; ok: false; error: string };

export type TrabajadorLike = {
  postMessage(mensaje: MensajeWorker): void;
  terminate(): void;
  onmessage: ((evento: { data: RespuestaWorker }) => void) | null;
};

export type ClientePython = {
  iniciar(): Promise<void>;
  ejecutar(preparacion: string, codigo: string): Promise<ResultadoEjecucion>;
  revisar(tarea: TareaPython, codigo: string): Promise<ResultadoRevision>;
  destruir(): void;
};

type SinId<T> = T extends unknown ? Omit<T, "id"> : never;

class ErrorDeTiempo extends Error {}

function mensajeDeTiempo(limiteMs: number): string {
  const segundos = Math.max(1, Math.round(limiteMs / 1000));
  return `Tu código tardó más de ${segundos} segundos y se detuvo. Revisa si tienes un ciclo que nunca termina.`;
}

export function crearClientePython(
  opciones: OpcionesPython,
  {
    crearTrabajador,
    limiteMs = 10_000,
    limiteCargaMs = 120_000,
  }: { crearTrabajador: () => TrabajadorLike; limiteMs?: number; limiteCargaMs?: number }
): ClientePython {
  let trabajador: TrabajadorLike | null = null;
  let listo: Promise<void> | null = null;
  let siguienteId = 1;
  const pendientes = new Map<number, { resolver: (valor: unknown) => void; rechazar: (error: Error) => void }>();

  function reiniciar() {
    trabajador?.terminate();
    trabajador = null;
    listo = null;
    for (const pendiente of pendientes.values()) pendiente.rechazar(new Error("El motor de Python se reinició."));
    pendientes.clear();
  }

  function enviar(mensaje: SinId<MensajeWorker>, limite: number): Promise<unknown> {
    const destino = trabajador;
    if (!destino) return Promise.reject(new Error("El motor de Python no está iniciado."));
    const id = siguienteId++;
    return new Promise((resolver, rechazar) => {
      const temporizador = setTimeout(() => {
        pendientes.delete(id);
        reiniciar();
        rechazar(new ErrorDeTiempo());
      }, limite);
      pendientes.set(id, {
        resolver: (valor) => {
          clearTimeout(temporizador);
          resolver(valor);
        },
        rechazar: (error) => {
          clearTimeout(temporizador);
          rechazar(error);
        },
      });
      destino.postMessage({ ...mensaje, id } as MensajeWorker);
    });
  }

  function iniciar(): Promise<void> {
    if (!listo) {
      trabajador = crearTrabajador();
      trabajador.onmessage = ({ data }) => {
        const pendiente = pendientes.get(data.id);
        if (!pendiente) return;
        pendientes.delete(data.id);
        if (data.ok) pendiente.resolver(data.resultado);
        else pendiente.rechazar(new Error(data.error));
      };
      const carga = enviar({ tipo: "iniciar", opciones }, limiteCargaMs).then(() => undefined);
      carga.catch(() => reiniciar());
      listo = carga;
    }
    return listo;
  }

  return {
    iniciar,
    async ejecutar(preparacion, codigo) {
      await iniciar();
      try {
        return (await enviar({ tipo: "ejecutar", preparacion, codigo }, limiteMs)) as ResultadoEjecucion;
      } catch (error) {
        if (error instanceof ErrorDeTiempo) return { ok: false, error: errorSimple(mensajeDeTiempo(limiteMs)), salida: "" };
        throw error;
      }
    },
    async revisar(tarea, codigo) {
      await iniciar();
      try {
        return (await enviar(
          { tipo: "revisar", preparacion: tarea.preparacion, pruebas: tarea.pruebas, codigo },
          limiteMs
        )) as ResultadoRevision;
      } catch (error) {
        if (error instanceof ErrorDeTiempo) return { aprobada: false, diagnostico: mensajeDeTiempo(limiteMs), salida: "" };
        throw error;
      }
    },
    destruir: reiniciar,
  };
}
