import { crearColaTutor, type ColaTutor, type TrabajoTutor } from "@syntaxerror/queue/tutor";

const globalParaCola = globalThis as { __syntaxerrorColaTutor?: ColaTutor };

export async function encolarTutor(trabajo: TrabajoTutor): Promise<void> {
  if (!globalParaCola.__syntaxerrorColaTutor) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    globalParaCola.__syntaxerrorColaTutor = crearColaTutor(url);
  }
  await globalParaCola.__syntaxerrorColaTutor.encolar(trabajo);
}
