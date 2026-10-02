import { describe, expect, it } from "vitest";
import { INTENTOS_PARA_TUTOR, pistasDisponibles, tutorHabilitado } from "./ayudas";

describe("ayudas", () => {
  it("la primera pista llega tras 2 intentos fallidos y luego una por intento, sin pasarse del total", () => {
    expect([0, 1, 2, 3, 4, 9].map((fallidos) => pistasDisponibles(fallidos, 3))).toEqual([0, 0, 1, 2, 3, 3]);
    expect(pistasDisponibles(5, 0)).toBe(0);
  });

  it("el tutor se habilita a los 5 intentos fallidos o con la misión aprobada", () => {
    expect(INTENTOS_PARA_TUTOR).toBe(5);
    expect(tutorHabilitado({ fallidos: 4, aprobada: false })).toBe(false);
    expect(tutorHabilitado({ fallidos: 5, aprobada: false })).toBe(true);
    expect(tutorHabilitado({ fallidos: 0, aprobada: true })).toBe(true);
  });
});
