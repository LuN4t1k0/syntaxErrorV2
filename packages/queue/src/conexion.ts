import type { ConnectionOptions } from "bullmq";

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

// Quien encola desde una request necesita fallar rapido si Redis no esta, no quedar colgado.
export function conexionProductor(url: string): ConnectionOptions {
  return { ...opcionesDesdeUrl(url), maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 2_000 };
}

// Los workers usan comandos bloqueantes: BullMQ exige maxRetriesPerRequest: null.
export function conexionWorker(url: string): ConnectionOptions {
  return { ...opcionesDesdeUrl(url), maxRetriesPerRequest: null };
}

export function conLimite<T>(promesa: Promise<T>, ms: number, mensaje: string): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const temporizador = setTimeout(() => rechazar(new Error(mensaje)), ms);
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
