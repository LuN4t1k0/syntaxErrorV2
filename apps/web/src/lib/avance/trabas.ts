import type { AvanceAlumno, CasoAvance, LeccionAvance } from "./datos";

export const DIAS_INACTIVO = 7;
// El umbral de la última pista: con 5 intentos fallidos ya vio todas las ayudas.
export const FALLIDOS_TRABA = 5;

export type Traba = { tipo: "inactivo" | "leccion" | "entrega" | "pregunta"; admin: string; alumno: string; href: string };
export type Siguiente = { texto: string; href: string };

const DIA_MS = 86_400_000;
const diasEntre = (desde: Date, ahora: Date) => Math.floor((ahora.getTime() - desde.getTime()) / DIA_MS);
const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export function haceCuanto(fecha: Date, ahora: Date): string {
  const n = diasEntre(fecha, ahora);
  if (n <= 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} días`;
}

function casosDelAvance(avance: AvanceAlumno): CasoAvance[] {
  const porSlug = new Map<string, CasoAvance>();
  for (const caso of [...avance.rutas.flatMap((ruta) => ruta.casos), ...avance.otrosCasos]) porSlug.set(caso.slug, caso);
  return [...porSlug.values()];
}

const ultimaFecha = (caso: CasoAvance) => Math.max(0, ...caso.lecciones.map((leccion) => leccion.actualizadoEn?.getTime() ?? 0));

// El caso en curso que tocó más recientemente, con su lección en curso más reciente o la primera sin aprobar.
export function casoEnCurso(avance: AvanceAlumno): { caso: CasoAvance; leccion: LeccionAvance | null } | null {
  const [caso] = casosDelAvance(avance)
    .filter((fila) => fila.estado === "en_curso")
    .sort((a, b) => ultimaFecha(b) - ultimaFecha(a));
  if (!caso) return null;
  const enCurso = caso.lecciones.filter((leccion) => leccion.estado === "en_curso").sort((a, b) => (b.actualizadoEn?.getTime() ?? 0) - (a.actualizadoEn?.getTime() ?? 0))[0];
  return { caso, leccion: enCurso ?? caso.lecciones.find((leccion) => leccion.estado !== "aprobada") ?? null };
}

export function siguienteDelAvance(avance: AvanceAlumno): Siguiente {
  const actual = casoEnCurso(avance);
  if (!actual) return { texto: "Elige una ruta en tu panel y empieza el primer caso.", href: "/dashboard" };
  if (actual.leccion) return { texto: `Sigue con ${actual.leccion.titulo}, de ${actual.caso.titulo}.`, href: actual.leccion.href };
  return { texto: `Te falta enlazar tu entregable de ${actual.caso.titulo} para completarlo.`, href: actual.caso.href };
}

export function trabasDelAlumno(avance: AvanceAlumno, ahora: Date): Traba[] {
  const trabas: Traba[] = [];
  const actual = casoEnCurso(avance);
  if (actual && avance.ultimaActividad) {
    const n = diasEntre(avance.ultimaActividad, ahora);
    if (n > DIAS_INACTIVO) {
      trabas.push({
        tipo: "inactivo",
        admin: `sin actividad hace ${dias(n)} · ${actual.caso.titulo}`,
        alumno: `Hace ${dias(n)} que no avanzas en ${actual.caso.titulo}.${actual.leccion ? ` Retoma en ${actual.leccion.titulo}.` : ""}`,
        href: actual.leccion?.href ?? actual.caso.href,
      });
    }
  }
  for (const caso of casosDelAvance(avance)) {
    for (const leccion of caso.lecciones) {
      if (leccion.estado === "aprobada" || leccion.fallidos < FALLIDOS_TRABA) continue;
      trabas.push({
        tipo: "leccion",
        admin: `${leccion.fallidos} intentos fallidos · ${caso.titulo} / ${leccion.titulo}`,
        alumno: `Llevas varios intentos en ${leccion.titulo}: abre las pistas o pregúntale al tutor.`,
        href: leccion.href,
      });
    }
  }
  for (const entrega of avance.entregas) {
    if (entrega.estado !== "observado") continue;
    trabas.push({
      tipo: "entrega",
      admin: `entrega observada · ${entrega.caso.titulo}`,
      alumno: `Tu entrega de ${entrega.caso.titulo} tiene observaciones: revísalas y vuelve a enviarla.`,
      href: `/casos/${entrega.caso.slug}`,
    });
  }
  for (const pregunta of avance.preguntasPendientes) {
    trabas.push({
      tipo: "pregunta",
      admin: `pregunta sin responder hace ${dias(diasEntre(pregunta.creadaEn, ahora))} · ${pregunta.caso.titulo}`,
      alumno: `Tu pregunta en ${pregunta.caso.titulo} todavía espera respuesta: te avisaremos por email.`,
      href: `/casos/${pregunta.caso.slug}/${pregunta.mision}`,
    });
  }
  return trabas;
}
