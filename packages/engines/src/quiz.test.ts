import { describe, expect, it } from "vitest";
import { revisarQuiz, type PreguntaQuiz } from "./quiz";

const preguntas: PreguntaQuiz[] = [
  { pregunta: "¿Qué manda en un análisis?", opciones: ["La fuente de datos", "El tono del modelo"], correcta: 0, explicacion: "Sin fuente no hay análisis." },
  { pregunta: "¿Antes de usar una conclusión?", opciones: ["Copiarla", "Validarla"], correcta: 1, explicacion: "La validación reduce errores." },
  { pregunta: "¿La IA garantiza conclusiones?", opciones: ["Sí", "No"], correcta: 1, explicacion: "Asiste, no garantiza." },
];

describe("revisarQuiz", () => {
  it("aprueba con todas las respuestas correctas", () => {
    expect(revisarQuiz(preguntas, [0, 1, 1])).toEqual({ aprobada: true, diagnostico: null, incorrectas: [] });
  });

  it("dice cuántas están bien y cuáles revisar, sin decir la correcta", () => {
    expect(revisarQuiz(preguntas, [0, 0, 1])).toEqual({ aprobada: false, diagnostico: "Tienes 2 de 3 respuestas correctas. Revisa la pregunta 2.", incorrectas: [1] });
    expect(revisarQuiz(preguntas, [1, 0, 1]).diagnostico).toBe("Tienes 1 de 3 respuestas correctas. Revisa las preguntas 1, 2.");
  });

  it("responder a medias no cuenta como intento fallido", () => {
    expect(revisarQuiz(preguntas, [0, null, 1])).toEqual({ aprobada: false, diagnostico: "Responde todas las preguntas antes de validar.", errorDeCodigo: true, incorrectas: [] });
  });
});
