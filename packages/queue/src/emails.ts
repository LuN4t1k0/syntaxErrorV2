import { Queue } from "bullmq";
import { conexionProductor, conLimite } from "./conexion";

export { conexionWorker } from "./conexion";

export const COLA_EMAILS = "emails";

type Destinatario = { para: string; nombre: string | null };

export type TrabajoEmail =
  | (Destinatario & { tipo: "verificar-email"; enlace: string })
  | (Destinatario & { tipo: "confirmar-nuevo-email"; enlace: string })
  | (Destinatario & { tipo: "aviso-cambio-email"; nuevoEmail: string })
  | (Destinatario & { tipo: "clave-cambiada" })
  | (Destinatario & { tipo: "recuperar-clave"; enlace: string })
  | (Destinatario & { tipo: "cuenta-eliminada" })
  | (Destinatario & { tipo: "certificado-emitido"; titulo: string; enlace: string })
  | (Destinatario & { tipo: "pregunta-profesor-nueva"; alumno: string; caso: string; mision: string; pregunta: string; enlace: string })
  | (Destinatario & { tipo: "pregunta-profesor-respondida"; caso: string; mision: string; pregunta: string; respuesta: string; enlace: string })
  | (Destinatario & { tipo: "resena-nueva"; caso: string; estrellas: number; comentario: string })
  | (Destinatario & { tipo: "reporte-nuevo"; tipoReporte: "error" | "sugerencia"; descripcion: string; pagina: string; autor: string })
  | (Destinatario & { tipo: "solicitud-docente-nueva"; solicitante: string })
  | (Destinatario & { tipo: "clase-solicitud"; alumno: string; clase: string; enlace: string })
  | (Destinatario & { tipo: "clase-decision"; clase: string; aceptada: boolean; enlace: string })
  | (Destinatario & { tipo: "mensaje-nuevo"; asunto: string; enlace: string });

export type ColaEmails = {
  encolar(trabajo: TrabajoEmail): Promise<void>;
  cerrar(): Promise<void>;
};

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
        limiteMs,
        "La cola de emails no responde."
      );
    },
    cerrar: () => cola.close(),
  };
}
