import { crearProveedorGemini } from "./gemini";
import { crearProveedorPrueba } from "./prueba";
import type { ProveedorIA } from "./tutor";

export function crearProveedorDesdeEntorno(entorno: Record<string, string | undefined> = process.env): ProveedorIA | null {
  if (entorno.GEMINI_API_KEY) {
    return crearProveedorGemini({ apiKey: entorno.GEMINI_API_KEY, modelo: entorno.GEMINI_MODEL || undefined });
  }
  // Solo para desarrollo y e2e. Nunca en producción.
  if (entorno.TUTOR_PRUEBA === "true") return crearProveedorPrueba();
  return null;
}
