import { MISION_ASISTENTE } from "@syntaxerror/ia/tutor";

// En la administración, las preguntas al asistente del curso se muestran con su nombre y no con "@asistente".
export function etiquetaDeMision(mision: string): string {
  return mision === MISION_ASISTENTE ? "Asistente del curso" : mision;
}
