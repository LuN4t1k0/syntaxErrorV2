import type { Job } from "bullmq";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { enviarEmail, type EmailSaliente } from "./enviar";
import { construirEmail } from "./mensajes";

export function crearProcesadorEmails(enviar: (email: EmailSaliente) => Promise<void> = enviarEmail) {
  return async (job: Job<TrabajoEmail>): Promise<void> => {
    const { asunto, html, texto } = construirEmail(job.data);
    await enviar({ para: job.data.para, asunto, html, texto });
  };
}
