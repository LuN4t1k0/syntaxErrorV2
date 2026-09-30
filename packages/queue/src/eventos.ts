// Sin dependencias de Node: lo importa tambien el navegador.
export const PROPOSITO_TUTOR = "tutor";
export const EVENTO_TUTOR = "tutor:respuesta";

export function salaTutor(clientId: string): string {
  return `tutor:${clientId}`;
}

export type EventoTutor = {
  preguntaId: string;
  estado: "respondida" | "fuera_de_tema" | "error";
  respuesta: string;
};
