import { beforeEach, describe, expect, it, vi } from "vitest";

const embedContent = vi.fn();
const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function () {
    return { models: { embedContent, generateContent } };
  }),
}));

const { crearProveedorGemini } = await import("./gemini");
const { RESPUESTA_FUERA_DE_TEMA } = await import("./tutor");

beforeEach(() => {
  embedContent.mockReset();
  generateContent.mockReset();
});

describe("crearProveedorGemini", () => {
  const proveedor = () => crearProveedorGemini({ apiKey: "clave" });

  it("vectoriza con el modelo de embeddings a 768 dimensiones", async () => {
    embedContent.mockResolvedValue({ embeddings: [{ values: [0.1, 0.2] }] });
    expect(await proveedor().vectorizar("hola")).toEqual([0.1, 0.2]);
    expect(embedContent).toHaveBeenCalledWith({
      model: "gemini-embedding-001",
      contents: "hola",
      config: { outputDimensionality: 768 },
    });
  });

  it("responde con las instrucciones del tutor y el contexto de la misión", async () => {
    generateContent.mockResolvedValue({ text: "  Usa WHERE sobre la columna ciudad.  " });
    expect(await proveedor().responder({ contexto: "Misión: Filtrar clientes.", pregunta: "¿Cómo filtro?" })).toEqual({
      aceptada: true,
      texto: "Usa WHERE sobre la columna ciudad.",
    });
    const [{ model, contents, config }] = generateContent.mock.calls[0];
    expect([model, contents]).toEqual(["gemini-2.5-flash-lite", "¿Cómo filtro?"]);
    expect(config.systemInstruction).toContain("Misión: Filtrar clientes.");
  });

  it("convierte la marca de fuera de tema en un mensaje para el alumno", async () => {
    generateContent.mockResolvedValue({ text: "[FUERA_DE_TEMA]" });
    expect(await proveedor().responder({ contexto: "x", pregunta: "¿Quién ganó el partido?" })).toEqual({
      aceptada: false,
      texto: RESPUESTA_FUERA_DE_TEMA,
    });
  });

  it("una respuesta vacía es un error, para que la cola reintente", async () => {
    generateContent.mockResolvedValue({ text: "" });
    await expect(proveedor().responder({ contexto: "x", pregunta: "¿Cómo filtro?" })).rejects.toThrow(
      "Gemini respondió vacío"
    );
  });
});
