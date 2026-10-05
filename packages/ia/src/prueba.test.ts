import { describe, expect, it } from "vitest";
import { crearProveedorPrueba, vectorDePrueba } from "./prueba";
import { similitudCoseno } from "./tutor";

describe("proveedor de prueba", () => {
  it("genera vectores deterministas de 768 dimensiones y norma 1", () => {
    const vector = vectorDePrueba("¿Cómo filtro por ciudad?");
    expect(vector).toHaveLength(768);
    expect(Math.hypot(...vector)).toBeCloseTo(1);
    expect(vectorDePrueba("¿Cómo filtro por ciudad?")).toEqual(vector);
  });

  it("dos preguntas parecidas quedan más cerca que dos distintas", () => {
    const base = vectorDePrueba("¿Cómo filtro los clientes por ciudad?");
    const parecida = vectorDePrueba("¿cómo filtro los clientes por su ciudad?");
    const distinta = vectorDePrueba("¿Qué es una fórmula SUMA en la planilla?");
    expect(similitudCoseno(base, parecida)).toBeGreaterThan(similitudCoseno(base, distinta));
  });

  it("responde con el título de la misión tomado del contexto", async () => {
    const respuesta = await crearProveedorPrueba().responder({
      contexto: "Caso: Ventas.\nMisión: Clientes de regiones.\nTarea SQL: filtrar",
      pregunta: " ¿Cómo filtro? ",
    });
    expect(respuesta).toEqual({
      aceptada: true,
      texto: 'Respuesta de prueba del tutor para la misión "Clientes de regiones": ¿Cómo filtro?',
    });
  });

  it("como asistente responde con el título del caso tomado del contexto", async () => {
    const responder = (contexto: string) => crearProveedorPrueba().responder({ rol: "asistente", contexto, pregunta: "¿Qué es un JOIN?" });
    const esperada = { aceptada: true, texto: 'Respuesta de prueba del asistente para el caso "Ventas de marzo": ¿Qué es un JOIN?' };
    expect(await responder("Caso: Ventas de marzo (Distribuidora). El alumno trabaja como analista de datos junior.\nMisiones: Filtrar.")).toEqual(esperada);
    expect(await responder("Caso: Ventas de marzo. Son clases: una lección por tema.")).toEqual(esperada);
  });
});
