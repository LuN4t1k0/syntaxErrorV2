import { crearColaEmails, type ColaEmails, type TrabajoEmail } from "@syntaxerror/queue/emails";

export type Encolar = (trabajo: TrabajoEmail) => Promise<void>;

const globalParaCola = globalThis as { __syntaxerrorColaEmails?: ColaEmails };

function cola(): ColaEmails {
  if (!globalParaCola.__syntaxerrorColaEmails) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    globalParaCola.__syntaxerrorColaEmails = crearColaEmails(url);
  }
  return globalParaCola.__syntaxerrorColaEmails;
}

// Para emails sin los que el alumno no puede seguir: el error llega a la ruta.
export const encolarEmail: Encolar = (trabajo) => cola().encolar(trabajo);

// Para avisos: si Redis no responde se registra el error y la acción del alumno sigue.
export const encolarSinFallar: Encolar = async (trabajo) => {
  try {
    await encolarEmail(trabajo);
  } catch (error) {
    console.error(`[emails] no se pudo encolar ${trabajo.tipo}`, error);
  }
};
