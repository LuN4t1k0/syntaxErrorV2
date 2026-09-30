import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { cargarContenido } from "@syntaxerror/content/cargar";
import type { Caso } from "@syntaxerror/content/tipos";
import { contextoDeMision } from "./contexto";

const FIXTURE = fileURLToPath(new URL("../../../../../packages/content/test/fixtures/valido", import.meta.url));
let caso: Caso;

beforeAll(async () => {
  [caso] = (await cargarContenido(FIXTURE)).casos;
});

describe("contextoDeMision", () => {
  it("describe el caso, la misión, el encargo, las tareas y las tablas", () => {
    const contexto = contextoDeMision(caso, caso.misiones[0]);
    expect(contexto).toContain("Caso: Ventas de marzo (Distribuidora de prueba).");
    expect(contexto).toContain("Misión: Filtrar clientes.");
    expect(contexto).toContain("Encargo de Paula, jefa comercial: Necesito los clientes fuera de Santiago.");
    expect(contexto).toContain("Tarea SQL:");
    expect(contexto).toContain("Tablas del caso: clientes(id, nombre, ciudad, monto).");
  });

  it("nunca incluye la solución, las pruebas ni el cierre de la misión", () => {
    const filtrar = contextoDeMision(caso, caso.misiones[0]);
    expect(filtrar).not.toContain("WHERE ciudad <> 'Santiago'");
    expect(filtrar).not.toContain("fila por fila");
    const hoja = contextoDeMision(caso, caso.misiones[1]);
    expect(hoja).not.toContain("=SUMA(D2:D4)");
    const python = contextoDeMision(caso, caso.misiones[2]);
    expect(python).not.toContain("162333");
    expect(python).not.toContain("sum(montos)");
  });

  it("no pasa de 4.000 caracteres", () => {
    const largo = { ...caso.misiones[0], titulo: "x".repeat(10_000) };
    expect(contextoDeMision(caso, largo).length).toBeLessThanOrEqual(4_000);
  });
});
