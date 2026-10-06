import { describe, expect, it } from "vitest";
import { estadosDeMisiones } from "./estados";

const misiones = ["m1", "m2", "m3", "m4"].map((slug) => ({ slug }));

describe("estadosDeMisiones", () => {
  it("distingue aprobada, en curso y bloqueadas en orden normal con sesion", () => {
    expect(
      estadosDeMisiones(
        misiones,
        {
          m1: { estado: "aprobada", tareasAprobadas: [], fallidos: 0 },
          m2: { estado: "en_curso", tareasAprobadas: [], fallidos: 0 },
        },
        { sesion: true, ordenLibre: false, casoBloqueado: false }
      )
    ).toEqual({ estados: ["aprobada", "en_curso", "bloqueada", "bloqueada"], siguiente: 1 });
  });

  it("marca la primera pendiente y bloquea el resto cuando hay sesion", () => {
    expect(estadosDeMisiones(misiones, {}, { sesion: true, ordenLibre: false, casoBloqueado: false })).toEqual({
      estados: ["pendiente", "bloqueada", "bloqueada", "bloqueada"],
      siguiente: 0,
    });
  });

  it("deja todo pendiente sin sesion para que se pueda explorar", () => {
    expect(estadosDeMisiones(misiones, {}, { sesion: false, ordenLibre: false, casoBloqueado: false })).toEqual({
      estados: ["pendiente", "pendiente", "pendiente", "pendiente"],
      siguiente: 0,
    });
  });

  it("respeta el orden libre", () => {
    expect(estadosDeMisiones(misiones, { m1: { estado: "aprobada", tareasAprobadas: [], fallidos: 0 } }, { sesion: true, ordenLibre: true, casoBloqueado: false })).toEqual({
      estados: ["aprobada", "pendiente", "pendiente", "pendiente"],
      siguiente: 1,
    });
  });

  it("bloquea lo pendiente si el caso completo esta bloqueado", () => {
    expect(estadosDeMisiones(misiones, { m1: { estado: "aprobada", tareasAprobadas: [], fallidos: 0 } }, { sesion: true, ordenLibre: false, casoBloqueado: true })).toEqual({
      estados: ["aprobada", "bloqueada", "bloqueada", "bloqueada"],
      siguiente: null,
    });
  });

  it("no marca siguiente cuando todo esta aprobado", () => {
    expect(
      estadosDeMisiones(
        misiones,
        Object.fromEntries(misiones.map((mision) => [mision.slug, { estado: "aprobada", tareasAprobadas: [], fallidos: 0 }])),
        { sesion: true, ordenLibre: false, casoBloqueado: false }
      )
    ).toEqual({ estados: ["aprobada", "aprobada", "aprobada", "aprobada"], siguiente: null });
  });
});
