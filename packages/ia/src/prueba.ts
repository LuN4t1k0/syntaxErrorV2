import { DIMENSIONES_EMBEDDING, type ProveedorIA } from "./tutor";

// Vector por trigramas: textos parecidos quedan cerca y el mismo texto da el mismo vector.
export function vectorDePrueba(texto: string): number[] {
  const vector = new Array<number>(DIMENSIONES_EMBEDDING).fill(0);
  const limpio = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (let i = 0; i + 3 <= limpio.length; i += 1) {
    let hash = 0;
    for (const caracter of limpio.slice(i, i + 3)) hash = (hash * 31 + caracter.charCodeAt(0)) >>> 0;
    vector[hash % DIMENSIONES_EMBEDDING] += 1;
  }
  const norma = Math.hypot(...vector) || 1;
  return vector.map((valor) => valor / norma);
}

// Solo para desarrollo y e2e: responde sin llamar a Gemini y deja ver que llegó el contexto de la misión.
export function crearProveedorPrueba(): ProveedorIA {
  return {
    nombre: "prueba",
    async vectorizar(texto) {
      return vectorDePrueba(texto);
    },
    async responder({ contexto, pregunta }) {
      const mision = contexto.match(/^Misión: (.+)\.$/m)?.[1] ?? "sin misión";
      return { aceptada: true, texto: `Respuesta de prueba del tutor para la misión "${mision}": ${pregunta.trim()}` };
    },
  };
}
