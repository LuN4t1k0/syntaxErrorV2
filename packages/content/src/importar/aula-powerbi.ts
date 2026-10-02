import { corregirTildes, type Leccion } from "./leccion";

// Adaptador del aula de Power BI de la v1 (aula-powerbi/src/data/lessons.js, exportado a JSON con sus datasets).
// Power BI se practica en Power BI Desktop, fuera de la plataforma: no hay nada que validar automáticamente.
// - Una práctica trae sus pasos y su dataset, y termina con una autocorrección (pregunta y respuesta): los pasos van
//   al concepto y la autocorrección es una LecturaTask, que muestra la respuesta al marcarla, como «Ver respuesta».
// - Una lectura trae una pregunta para reflexionar y su respuesta: también es una LecturaTask.

export type SeccionPowerBiV1 = { heading: string; body: string[]; code: string | null };
export type LeccionPowerBiV1 = {
  slug: string;
  title: string;
  duration: string;
  type: "practice" | "reading";
  intro?: string[];
  sections?: SeccionPowerBiV1[];
  prompt?: string;
  explanation?: string;
  practiceSteps?: string[];
  datasetFile?: string;
  selfCheck?: { question: string; answer: string };
};

// Los encabezados de los datasets (region, categoria) aparecen en los pasos como nombres de columna: se escriben sin
// tilde, igual que en el archivo, y el diccionario no los toca.
export function columnasDeDatasets(archivos: Record<string, string>): Set<string> {
  return new Set(Object.values(archivos).flatMap((contenido) => (contenido.split(/\r?\n/, 1)[0] ?? "").split(",").map((columna) => columna.trim().toLowerCase())));
}

// casoSlug sirve para enlazar el dataset de la práctica en «Datos del caso» (/casos/<caso>/datos/<archivo>).
export function convertirLeccionPowerBi(v1: LeccionPowerBiV1, numero: number, casoSlug: string, excepto: ReadonlySet<string> = new Set()): Leccion {
  // Las comillas simples encierran nombres de menús ('Obtener datos'), no valores de datos: también se corrigen.
  const texto = (valor: string) => corregirTildes(valor, excepto, { respetarComillas: false });
  const base = {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: Number.parseInt(v1.duration, 10) || 10,
    intro: (v1.intro ?? []).map(texto),
    sintaxis: null,
    // El código de Power BI (M o DAX) solo se muestra: no se ejecuta en la plataforma.
    secciones: (v1.sections ?? []).map((seccion) => ({ titulo: texto(seccion.heading), parrafos: seccion.body.map(texto), ejemplo: null, codigo: seccion.code, lenguaje: "text" })),
    cierre: null,
  };
  if (v1.type === "reading") {
    if (!v1.prompt || !v1.explanation) throw new Error(`La lectura ${v1.slug} no tiene pregunta o respuesta`);
    return { ...base, tarea: { tipo: "LecturaTask", id: v1.slug, pregunta: texto(v1.prompt), respuesta: texto(v1.explanation) } };
  }
  if (!v1.prompt || !v1.practiceSteps?.length || !v1.selfCheck) throw new Error(`La práctica ${v1.slug} no tiene enunciado, pasos o autocorrección`);
  const nombre = v1.datasetFile ?? null;
  return {
    ...base,
    practica: {
      enunciado: texto(v1.prompt),
      pasos: v1.practiceSteps.map(texto),
      datos: nombre ? { nombre, enlace: `/casos/${casoSlug}/datos/${nombre}` } : null,
    },
    tarea: { tipo: "LecturaTask", id: v1.slug, pregunta: texto(v1.selfCheck.question), respuesta: texto(v1.selfCheck.answer) },
  };
}
