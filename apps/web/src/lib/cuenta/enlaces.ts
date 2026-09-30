import { absoluteUrl } from "@/lib/seo";

export const enlaceVerificarEmail = (token: string) => absoluteUrl(`/verificar-email?token=${encodeURIComponent(token)}`);
export const enlaceConfirmarEmail = (token: string) => absoluteUrl(`/confirmar-email?token=${encodeURIComponent(token)}`);
export const enlaceRestablecerClave = (token: string) => absoluteUrl(`/restablecer-clave?token=${encodeURIComponent(token)}`);
export const enlaceCertificado = (codigo: string) => absoluteUrl(`/certificados/${codigo}`);
export const enlaceVerificarCertificado = (codigo: string) => absoluteUrl(`/verificar/${codigo}`);
export const enlacePortafolio = (usuario: string) => absoluteUrl(`/p/${usuario}`);
