import { describe, expect, it } from "vitest";
import type { AvanceAlumno, CasoAvance, LeccionAvance } from "./datos";
import { casoEnCurso, DIAS_INACTIVO, FALLIDOS_TRABA, haceCuanto, siguienteDelAvance, trabasDelAlumno } from "./trabas";

const AHORA = new Date(Date.UTC(2026, 9, 20, 12));
const haceDias = (n: number) => new Date(AHORA.getTime() - n * 86_400_000);

function leccion(slug: string, estado: LeccionAvance["estado"], fallidos = 0, actualizadoEn: Date | null = null): LeccionAvance {
  return { slug, titulo: `Lección ${slug}`, estado, intentos: fallidos, fallidos, actualizadoEn, href: `/casos/excel/${slug}` };
}

function caso(lecciones: LeccionAvance[], estado: CasoAvance["estado"] = "en_curso", tipo: CasoAvance["tipo"] = "clases", slug = "excel"): CasoAvance {
  return { slug, titulo: `Caso ${slug}`, tipo, estado, aprobadas: lecciones.filter((fila) => fila.estado === "aprobada").length, total: lecciones.length, lecciones, href: `/casos/${slug}` };
}

function avance(parcial: Partial<AvanceAlumno> = {}): AvanceAlumno {
  return {
    perfil: { id: "u", nombre: "Ana", email: "ana@correo.cl", rol: "student", probador: false, verificado: true, registradoEn: haceDias(30), nivel: { puntos: 0, nivel: 1, faltan: 100 } },
    ultimaActividad: null,
    rutas: [],
    otrosCasos: [],
    entregas: [],
    preguntasPendientes: [],
    actividad: [],
    ...parcial,
  };
}

describe("trabasDelAlumno", () => {
  it("sin avance no hay trabas", () => {
    expect(trabasDelAlumno(avance(), AHORA)).toEqual([]);
  });

  it(`inactivo: con ${DIAS_INACTIVO} días no aparece y con uno más sí, y sugiere retomar la lección en curso`, () => {
    const enCurso = caso([leccion("01", "aprobada"), leccion("02", "en_curso", 1, haceDias(8))]);
    const rutas = [{ slug: "data", titulo: "Data", completos: 0, casos: [enCurso] }];
    expect(trabasDelAlumno(avance({ rutas, ultimaActividad: haceDias(DIAS_INACTIVO) }), AHORA)).toEqual([]);
    expect(trabasDelAlumno(avance({ rutas, ultimaActividad: haceDias(DIAS_INACTIVO + 1) }), AHORA)).toEqual([
      { tipo: "inactivo", admin: "sin actividad hace 8 días · Caso excel", alumno: "Hace 8 días que no avanzas en Caso excel. Retoma en Lección 02.", href: "/casos/excel/02" },
    ]);
  });

  it("inactivo no aplica si no tiene casos en curso", () => {
    const completo = caso([leccion("01", "aprobada")], "completo");
    expect(trabasDelAlumno(avance({ otrosCasos: [completo], ultimaActividad: haceDias(40) }), AHORA)).toEqual([]);
  });

  it(`lección: ${FALLIDOS_TRABA} fallidos sin aprobar es traba; ${FALLIDOS_TRABA - 1} no, y una aprobada tampoco`, () => {
    const otros = [caso([leccion("01", "en_curso", FALLIDOS_TRABA - 1), leccion("02", "en_curso", FALLIDOS_TRABA), leccion("03", "aprobada", 9)])];
    expect(trabasDelAlumno(avance({ otrosCasos: otros, ultimaActividad: AHORA }), AHORA)).toEqual([
      { tipo: "leccion", admin: "5 intentos fallidos · Caso excel / Lección 02", alumno: "Llevas varios intentos en Lección 02: abre las pistas o pregúntale al tutor.", href: "/casos/excel/02" },
    ]);
  });

  it("un caso que está en dos rutas no repite sus trabas", () => {
    const repetido = caso([leccion("01", "en_curso", 6)]);
    const rutas = [{ slug: "a", titulo: "A", completos: 0, casos: [repetido] }, { slug: "b", titulo: "B", completos: 0, casos: [repetido] }];
    expect(trabasDelAlumno(avance({ rutas, ultimaActividad: AHORA }), AHORA)).toHaveLength(1);
  });

  it("entrega observada y pregunta pendiente", () => {
    const entregas = [{ caso: { slug: "ventas", titulo: "Ventas" }, estado: "observado" as const, url: "u", puntajes: {}, observaciones: {}, comentario: null, enviadaEn: haceDias(3), revisadaEn: haceDias(2) }];
    const preguntasPendientes = [{ id: "p", caso: { slug: "ventas", titulo: "Ventas" }, mision: "m1", creadaEn: haceDias(1) }];
    expect(trabasDelAlumno(avance({ entregas, preguntasPendientes }), AHORA)).toEqual([
      { tipo: "entrega", admin: "entrega observada · Ventas", alumno: "Tu entrega de Ventas tiene observaciones: revísalas y vuelve a enviarla.", href: "/casos/ventas" },
      { tipo: "pregunta", admin: "pregunta sin responder hace 1 día · Ventas", alumno: "Tu pregunta en Ventas todavía espera respuesta: te avisaremos por email.", href: "/casos/ventas/m1" },
    ]);
  });
});

describe("siguienteDelAvance y casoEnCurso", () => {
  it("sin casos en curso, sugiere elegir una ruta", () => {
    expect(siguienteDelAvance(avance())).toEqual({ texto: "Elige una ruta en tu panel y empieza el primer caso.", href: "/dashboard" });
    expect(casoEnCurso(avance())).toBeNull();
  });

  it("el caso en curso más reciente y su lección en curso o la primera sin aprobar", () => {
    const viejo = caso([leccion("01", "en_curso", 0, haceDias(9))], "en_curso", "clases", "viejo");
    const nuevo = caso([leccion("01", "aprobada", 0, haceDias(1)), leccion("02", "sin_empezar")], "en_curso", "clases", "nuevo");
    const datos = avance({ otrosCasos: [viejo, nuevo] });
    expect(casoEnCurso(datos)?.caso.slug).toBe("nuevo");
    expect(siguienteDelAvance(datos)).toEqual({ texto: "Sigue con Lección 02, de Caso nuevo.", href: "/casos/excel/02" });
  });

  it("un caso con todas las misiones aprobadas y sin completar pide el entregable", () => {
    const listo = caso([leccion("m1", "aprobada", 0, haceDias(1))], "en_curso", "caso", "ventas");
    expect(siguienteDelAvance(avance({ otrosCasos: [listo] }))).toEqual({ texto: "Te falta enlazar tu entregable de Caso ventas para completarlo.", href: "/casos/ventas" });
  });
});

describe("entrega en revisión", () => {
  const entrega = (estado: "pendiente" | "observado") => ({ caso: { slug: "ventas", titulo: "Caso ventas" }, estado, url: "u", puntajes: {}, observaciones: {}, comentario: null, enviadaEn: haceDias(10), revisadaEn: null });
  const listo = caso([leccion("m1", "aprobada", 0, haceDias(10))], "en_curso", "caso", "ventas");

  it("quien espera la revisión no está inactivo y su siguiente paso es esperar", () => {
    const datos = avance({ otrosCasos: [listo], entregas: [entrega("pendiente")], ultimaActividad: haceDias(10) });
    expect(trabasDelAlumno(datos, AHORA)).toEqual([]);
    expect(siguienteDelAvance(datos)).toEqual({ texto: "Tu entrega de Caso ventas está en revisión: te avisaremos por email cuando la revisen.", href: "/casos/ventas" });
  });

  it("con una entrega en revisión, el siguiente paso es otro caso que sí puede avanzar", () => {
    const otro = caso([leccion("01", "en_curso", 0, haceDias(20))], "en_curso", "clases", "excel");
    const datos = avance({ otrosCasos: [listo, otro], entregas: [entrega("pendiente")], ultimaActividad: haceDias(10) });
    expect(casoEnCurso(datos)?.caso.slug).toBe("excel");
    expect(trabasDelAlumno(datos, AHORA).map((traba) => traba.tipo)).toEqual(["inactivo"]);
  });

  it("una entrega observada pide corregirla, no enlazarla", () => {
    expect(siguienteDelAvance(avance({ otrosCasos: [listo], entregas: [entrega("observado")] }))).toEqual({ texto: "Tu entrega de Caso ventas tiene observaciones: revísalas y vuelve a enviarla.", href: "/casos/ventas" });
  });
});

describe("haceCuanto", () => {
  it("hoy, ayer y hace N días", () => {
    expect(haceCuanto(haceDias(0), AHORA)).toBe("hoy");
    expect(haceCuanto(haceDias(1), AHORA)).toBe("ayer");
    expect(haceCuanto(haceDias(12), AHORA)).toBe("hace 12 días");
  });
});
