import { describe, expect, it } from "vitest";
import { calcularRacha, diaLocal, inicioSemana } from "./dias";

describe("diaLocal", () => {
  it("usa la hora de Chile y no la de UTC", () => {
    // 02:30 UTC del 24 es todavía el 23 en Santiago (UTC-3).
    expect(diaLocal(new Date("2026-10-24T02:30:00Z"))).toBe("2026-10-23");
    expect(diaLocal(new Date("2026-10-24T03:30:00Z"))).toBe("2026-10-24");
  });
});

describe("inicioSemana", () => {
  it("vuelve al lunes de la misma semana", () => {
    expect(inicioSemana("2026-10-23")).toBe("2026-10-19");
    expect(inicioSemana("2026-10-19")).toBe("2026-10-19");
    expect(inicioSemana("2026-10-25")).toBe("2026-10-19");
    expect(inicioSemana("2026-11-01")).toBe("2026-10-26");
  });
});

describe("calcularRacha", () => {
  it("cuenta los días seguidos hasta hoy", () => {
    expect(calcularRacha(["2026-10-21", "2026-10-22", "2026-10-23"], "2026-10-23")).toBe(3);
  });

  it("mantiene la racha de ayer mientras hoy no hay actividad", () => {
    expect(calcularRacha(["2026-10-21", "2026-10-22"], "2026-10-23")).toBe(2);
  });

  it("se corta con un día sin actividad", () => {
    expect(calcularRacha(["2026-10-19", "2026-10-21", "2026-10-23"], "2026-10-23")).toBe(1);
    expect(calcularRacha(["2026-10-20"], "2026-10-23")).toBe(0);
    expect(calcularRacha([], "2026-10-23")).toBe(0);
  });

  it("cruza el cambio de mes", () => {
    expect(calcularRacha(["2026-09-30", "2026-10-01"], "2026-10-01")).toBe(2);
  });
});
