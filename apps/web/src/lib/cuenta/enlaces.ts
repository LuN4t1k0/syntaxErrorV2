import { absoluteUrl } from "@/lib/seo";

export const enlaceVerificarEmail = (token: string) => absoluteUrl(`/verificar-email?token=${encodeURIComponent(token)}`);
export const enlaceConfirmarEmail = (token: string) => absoluteUrl(`/confirmar-email?token=${encodeURIComponent(token)}`);
export const enlaceRestablecerClave = (token: string) => absoluteUrl(`/restablecer-clave?token=${encodeURIComponent(token)}`);
export const enlaceCertificado = (codigo: string) => absoluteUrl(`/certificados/${codigo}`);
export const enlaceVerificarCertificado = (codigo: string) => absoluteUrl(`/verificar/${codigo}`);
export const enlacePortafolio = (usuario: string) => absoluteUrl(`/p/${usuario}`);
export const enlacePanelDocente = (claseId?: string) => absoluteUrl(claseId ? `/profesor/clases/${claseId}` : "/profesor");
export const enlacePreguntasDocente = () => absoluteUrl("/profesor/preguntas");
export const enlaceMisPreguntas = () => absoluteUrl("/dashboard/preguntas");
export const enlaceMisClases = () => absoluteUrl("/dashboard/clases");
export const enlaceMensajes = () => absoluteUrl("/dashboard/mensajes");
export const enlaceAvance = () => absoluteUrl("/dashboard/avance");
