import { GoogleGenAI } from "@google/genai";
import {
  DIMENSIONES_EMBEDDING,
  RESPUESTA_FUERA_DE_TEMA,
  esFueraDeTema,
  instruccionesDelTutor,
  type ProveedorIA,
} from "./tutor";

export const MODELO_RESPUESTAS = "gemini-2.5-flash-lite";
export const MODELO_EMBEDDINGS = "gemini-embedding-001";

export function crearProveedorGemini({
  apiKey,
  modelo = MODELO_RESPUESTAS,
  modeloEmbeddings = MODELO_EMBEDDINGS,
}: {
  apiKey: string;
  modelo?: string;
  modeloEmbeddings?: string;
}): ProveedorIA {
  const cliente = new GoogleGenAI({ apiKey });
  return {
    nombre: "gemini",
    async vectorizar(texto) {
      const resultado = await cliente.models.embedContent({
        model: modeloEmbeddings,
        contents: texto,
        config: { outputDimensionality: DIMENSIONES_EMBEDDING },
      });
      const valores = resultado.embeddings?.[0]?.values;
      if (!valores) throw new Error("Gemini no devolvió el embedding");
      return valores;
    },
    async responder({ contexto, pregunta }) {
      const resultado = await cliente.models.generateContent({
        model: modelo,
        contents: pregunta,
        config: { systemInstruction: instruccionesDelTutor(contexto), maxOutputTokens: 800 },
      });
      const texto = (resultado.text ?? "").trim();
      if (!texto) throw new Error("Gemini respondió vacío");
      return esFueraDeTema(texto) ? { aceptada: false, texto: RESPUESTA_FUERA_DE_TEMA } : { aceptada: true, texto };
    },
  };
}
