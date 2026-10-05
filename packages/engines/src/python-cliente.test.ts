import { describe, expect, it } from "vitest";
import {
  crearClientePython,
  type MensajeWorker,
  type RespuestaWorker,
  type TrabajadorLike,
} from "./python-cliente";

type Responder = (mensaje: MensajeWorker) => RespuestaWorker | null;

class TrabajadorFalso implements TrabajadorLike {
  onmessage: ((evento: { data: RespuestaWorker }) => void) | null = null;
  mensajes: MensajeWorker[] = [];
  terminado = false;

  constructor(private readonly responder: Responder) {}

  postMessage(mensaje: MensajeWorker) {
    this.mensajes.push(mensaje);
    const respuesta = this.responder(mensaje);
    if (respuesta) queueMicrotask(() => this.onmessage?.({ data: respuesta }));
  }

  terminate() {
    this.terminado = true;
  }
}

const opciones = { paquetes: ["pandas"], archivos: [] };
const aprobada = { aprobada: true, diagnostico: null, salida: "" };
const tarea = { preparacion: "", pruebas: "assert True" };

function responde(resultados: Partial<Record<MensajeWorker["tipo"], unknown>>): Responder {
  return (mensaje) =>
    mensaje.tipo in resultados ? { id: mensaje.id, ok: true, resultado: resultados[mensaje.tipo] } : null;
}

describe("crearClientePython", () => {
  it("inicia el worker una sola vez y le pasa las opciones", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython(opciones, {
      crearTrabajador: () => {
        const trabajador = new TrabajadorFalso(responde({ iniciar: null, revisar: aprobada }));
        creados.push(trabajador);
        return trabajador;
      },
    });

    expect(await cliente.revisar(tarea, "x = 1")).toEqual(aprobada);
    await cliente.revisar(tarea, "x = 2");

    expect(creados).toHaveLength(1);
    expect(creados[0].mensajes.map((mensaje) => mensaje.tipo)).toEqual(["iniciar", "revisar", "revisar"]);
    expect(creados[0].mensajes[0]).toMatchObject({ tipo: "iniciar", opciones });
  });

  it("reconfigurar con otras opciones reusa el mismo worker: le manda las nuevas sin volver a cargar Python", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython(opciones, {
      crearTrabajador: () => {
        const trabajador = new TrabajadorFalso(responde({ iniciar: null, revisar: aprobada }));
        creados.push(trabajador);
        return trabajador;
      },
    });
    await cliente.iniciar();
    const otras = { paquetes: [], archivos: [{ ruta: "datos/ventas.csv", contenido: "id\n1\n" }] };
    await cliente.reconfigurar(otras);
    await cliente.revisar(tarea, "x = 1");
    // Las mismas opciones no vuelven a configurar nada.
    await cliente.reconfigurar({ ...otras });

    expect(creados).toHaveLength(1);
    expect(creados[0].mensajes.map((mensaje) => mensaje.tipo)).toEqual(["iniciar", "iniciar", "revisar"]);
    expect(creados[0].mensajes[1]).toMatchObject({ tipo: "iniciar", opciones: otras });
  });

  it("reconfigurar antes de iniciar solo cambia las opciones con las que va a partir", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython(opciones, {
      crearTrabajador: () => {
        const trabajador = new TrabajadorFalso(responde({ iniciar: null }));
        creados.push(trabajador);
        return trabajador;
      },
    });
    const otras = { paquetes: [], archivos: [] };
    await cliente.reconfigurar(otras);
    expect(creados).toHaveLength(1);
    expect(creados[0].mensajes).toEqual([expect.objectContaining({ tipo: "iniciar", opciones: otras })]);
  });

  it("corta un ciclo infinito, avisa y la siguiente revisión usa un worker nuevo", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython(opciones, {
      limiteMs: 50,
      crearTrabajador: () => {
        const cuelga = creados.length === 0;
        const trabajador = new TrabajadorFalso(
          responde(cuelga ? { iniciar: null } : { iniciar: null, revisar: aprobada })
        );
        creados.push(trabajador);
        return trabajador;
      },
    });

    const cortada = await cliente.revisar(tarea, "while True: pass");
    expect(cortada.aprobada).toBe(false);
    expect(cortada.diagnostico).toContain("tardó más de");
    expect(creados[0].terminado).toBe(true);

    expect(await cliente.revisar(tarea, "x = 1")).toEqual(aprobada);
    expect(creados).toHaveLength(2);
    expect(creados[1].mensajes.map((mensaje) => mensaje.tipo)).toEqual(["iniciar", "revisar"]);
  });

  it("ejecutar también se corta por tiempo", async () => {
    const cliente = crearClientePython(opciones, {
      limiteMs: 50,
      crearTrabajador: () => new TrabajadorFalso(responde({ iniciar: null })),
    });
    const resultado = await cliente.ejecutar("", "while True: pass");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toMatchObject({ mensaje: expect.stringContaining("tardó más de"), linea: null });
  });

  it("si la carga falla se puede reintentar", async () => {
    let intentos = 0;
    const cliente = crearClientePython(opciones, {
      crearTrabajador: () => {
        intentos += 1;
        const falla = intentos === 1;
        return new TrabajadorFalso((mensaje) =>
          falla ? { id: mensaje.id, ok: false, error: "sin red" } : { id: mensaje.id, ok: true, resultado: null }
        );
      },
    });

    await expect(cliente.iniciar()).rejects.toThrow("sin red");
    await expect(cliente.iniciar()).resolves.toBeUndefined();
    expect(intentos).toBe(2);
  });
});
