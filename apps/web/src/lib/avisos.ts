import { crearColaAvisos, type ColaAvisos, type TrabajoAviso } from "@syntaxerror/queue/avisos";

export type Avisar = (trabajo: TrabajoAviso) => Promise<void>;

const globalParaCola = globalThis as { __syntaxerrorColaAvisos?: ColaAvisos };

export const avisarSinFallar: Avisar = async (trabajo) => {
  try {
    if (!globalParaCola.__syntaxerrorColaAvisos) {
      const url = process.env.REDIS_URL;
      if (!url) throw new Error("REDIS_URL is not set");
      globalParaCola.__syntaxerrorColaAvisos = crearColaAvisos(url);
    }
    await globalParaCola.__syntaxerrorColaAvisos.encolar(trabajo);
  } catch (error) {
    console.error(`[avisos] no se pudo encolar ${trabajo.evento}`, error);
  }
};
