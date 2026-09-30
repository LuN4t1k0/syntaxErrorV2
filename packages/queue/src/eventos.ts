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

export const PROPOSITO_USUARIO = "usuario";
export const EVENTO_PREGUNTA_NUEVA = "profesor:pregunta-nueva";
export const EVENTO_PREGUNTA_RESPONDIDA = "profesor:pregunta-respondida";

export type EventoComunidad = typeof EVENTO_PREGUNTA_NUEVA | typeof EVENTO_PREGUNTA_RESPONDIDA;
export type AvisoPregunta = { preguntaId: string };

export function salaUsuario(userId: string): string {
  return `usuario:${userId}`;
}
