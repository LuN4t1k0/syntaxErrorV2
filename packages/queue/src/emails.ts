import { Queue, type ConnectionOptions } from "bullmq";

export const COLA_EMAILS = "emails";

type Destinatario = { para: string; nombre: string | null };

export type TrabajoEmail =
  | (Destinatario & { tipo: "verificar-email"; enlace: string })
  | (Destinatario & { tipo: "confirmar-nuevo-email"; enlace: string })
  | (Destinatario & { tipo: "aviso-cambio-email"; nuevoEmail: string })
  | (Destinatario & { tipo: "clave-cambiada" })
  | (Destinatario & { tipo: "recuperar-clave"; enlace: string })
  | (Destinatario & { tipo: "cuenta-eliminada" })
  | (Destinatario & { tipo: "certificado-emitido"; titulo: string; enlace: string });

export type ColaEmails = {
  encolar(trabajo: TrabajoEmail): Promise<void>;
  cerrar(): Promise<void>;
};

function opcionesDesdeUrl(url: string) {
  const direccion = new URL(url);
  return {
    host: direccion.hostname,
    port: Number(direccion.port || 6379),
    username: direccion.username ? decodeURIComponent(direccion.username) : undefined,
    password: direccion.password ? decodeURIComponent(direccion.password) : undefined,
    db: direccion.pathname.length > 1 ? Number(direccion.pathname.slice(1)) : 0,
  };
}

// Quien encola desde una request necesita fallar rápido si Redis no está, no quedar colgado.
function conexionProductor(url: string): ConnectionOptions {
  return { ...opcionesDesdeUrl(url), maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 2_000 };
}

// Los workers usan comandos bloqueantes: BullMQ exige maxRetriesPerRequest: null.
export function conexionWorker(url: string): ConnectionOptions {
  return { ...opcionesDesdeUrl(url), maxRetriesPerRequest: null };
}

function conLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const temporizador = setTimeout(() => rechazar(new Error("La cola de emails no responde.")), ms);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolver(valor);
      },
      (error: unknown) => {
        clearTimeout(temporizador);
        rechazar(error);
      }
    );
  });
}

export function crearColaEmails(
  url: string,
  { nombre = COLA_EMAILS, limiteMs = 3_000 }: { nombre?: string; limiteMs?: number } = {}
): ColaEmails {
  const cola = new Queue<TrabajoEmail>(nombre, { connection: conexionProductor(url) });
  // Los errores de conexión se informan al encolar; sin este listener, ensucian el log en cada reintento.
  cola.on("error", () => {});

  return {
    async encolar(trabajo) {
      await conLimite(
        cola.add(trabajo.tipo, trabajo, {
          attempts: 5,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        }),
        limiteMs
      );
    },
    cerrar: () => cola.close(),
  };
}
