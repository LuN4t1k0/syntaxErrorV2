import { describe, expect, it } from "vitest";
import { crearClientePython, type MensajeWorker, type RespuestaWorker, type TrabajadorLike } from "./python-cliente";

class TrabajadorFalso implements TrabajadorLike {
  onmessage: ((evento: { data: RespuestaWorker }) => void) | null = null;
  terminado = false;
  constructor(private readonly responder: (mensaje: MensajeWorker) => RespuestaWorker | null) {}
  postMessage(mensaje: MensajeWorker) {
    const respuesta = this.responder(mensaje);
    if (respuesta) queueMicrotask(() => this.onmessage?.({ data: respuesta }));
  }
  terminate() {
    this.terminado = true;
  }
}

describe("python-cliente", () => {
  it("reinicia el worker si una revisión se queda colgada", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython({ paquetes: [], archivos: [] }, {
      limiteMs: 20,
      crearTrabajador: () => {
        const cuelga = creados.length === 0;
        const trabajador = new TrabajadorFalso((mensaje) => {
          if (mensaje.tipo === "iniciar") return { id: mensaje.id, ok: true, resultado: null };
          return cuelga ? null : { id: mensaje.id, ok: true, resultado: { aprobada: true, diagnostico: null, salida: "" } };
        });
        creados.push(trabajador);
        return trabajador;
      },
    });
    expect((await cliente.revisar({ preparacion: "", pruebas: "" }, "while True: pass")).aprobada).toBe(false);
    expect(creados[0].terminado).toBe(true);
    expect(await cliente.revisar({ preparacion: "", pruebas: "" }, "x = 1")).toEqual({ aprobada: true, diagnostico: null, salida: "" });
  });
});
