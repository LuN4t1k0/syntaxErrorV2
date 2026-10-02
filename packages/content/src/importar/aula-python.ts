import { corregirTildes, type Leccion } from "./leccion";

// Adaptador del aula de Python de la v1 (aula-python/src/data/lessons.js, exportado a JSON).
// La v1 corría setupCode, después el código de la persona, y comparaba una variable (resultVariable) con expectedValue:
// con tolerancia si es un número, y por igualdad en el resto. Eso pasa a ser la preparación y la prueba de un
// PythonTask. La v1 no guardaba la solución: se saca de la explicación («resultado = precio*stock = 1350000»), y el
// validador comprueba que dé el valor esperado.

export type SeccionPythonV1 = { heading: string; body: string[]; code: string | null };
export type LeccionPythonV1 = {
  slug: string;
  title: string;
  duration: string;
  type: "exercise" | "reading";
  intro?: string[];
  syntaxExample?: string | null;
  sections?: SeccionPythonV1[];
  setupCode?: string;
  starterCode?: string;
  resultVariable?: string;
  expectedValue?: unknown;
  prompt?: string;
  explanation?: string;
};

// El valor esperado escrito como Python: los textos y números se escriben igual que en JSON; las listas y los
// diccionarios también, salvo true, false y null.
export function aPython(valor: unknown): string {
  if (valor === null || valor === undefined) return "None";
  if (valor === true) return "True";
  if (valor === false) return "False";
  if (Array.isArray(valor)) return `[${valor.map(aPython).join(", ")}]`;
  if (typeof valor === "object") return `{${Object.entries(valor).map(([clave, dato]) => `${JSON.stringify(clave)}: ${aPython(dato)}`).join(", ")}}`;
  return JSON.stringify(valor);
}

// La prueba de la v1: un número se compara con tolerancia; el resto, por igualdad. El mensaje no dice el valor
// esperado, para que la persona lo calcule.
export function pruebaPython(variable: string, esperado: unknown): string {
  return [
    "import numbers",
    `esperado = ${aPython(esperado)}`,
    `if isinstance(esperado, numbers.Number) and isinstance(${variable}, numbers.Number):`,
    `    assert abs(${variable} - esperado) < 0.0001, "${variable} no tiene el valor esperado: revisa el cálculo."`,
    "else:",
    `    assert ${variable} == esperado, "${variable} no tiene el valor esperado: revisa el cálculo."`,
  ].join("\n");
}

// Lee una expresión de Python desde «desde» hasta « = » o un punto final fuera de paréntesis, corchetes y comillas.
export function leerExpresion(texto: string, desde: number): string {
  let profundidad = 0;
  let comillas: string | null = null;
  let fin = desde;
  for (; fin < texto.length; fin += 1) {
    const caracter = texto[fin];
    if (comillas) {
      if (caracter === comillas) comillas = null;
      continue;
    }
    if (caracter === '"' || caracter === "'") comillas = caracter;
    else if ("([{".includes(caracter)) profundidad += 1;
    else if (")]}".includes(caracter)) profundidad -= 1;
    else if (profundidad === 0 && texto.startsWith(" = ", fin)) break;
    else if (profundidad === 0 && texto.startsWith(" produce", fin)) break;
    else if (profundidad === 0 && caracter === "," && texto[fin + 1] === " ") break;
    else if (profundidad === 0 && caracter === "." && (fin + 1 === texto.length || /\s/.test(texto[fin + 1]))) break;
  }
  return texto.slice(desde, fin).trim();
}

// La solución: el código inicial con «resultado = None» reemplazado por la expresión de la explicación. Si la
// explicación no la trae, queda null y la escribe la revisión editorial.
export function solucionPython(v1: LeccionPythonV1): string | null {
  const variable = v1.resultVariable ?? "resultado";
  const inicial = v1.starterCode ?? "";
  const marca = `${variable} = `;
  const desde = (v1.explanation ?? "").indexOf(marca);
  if (desde < 0) return null;
  const expresion = leerExpresion(v1.explanation ?? "", desde + marca.length);
  if (!expresion) return null;
  const linea = new RegExp(`^${variable} = None\\s*$`, "m");
  if (!linea.test(inicial)) return null;
  return inicial.replace(linea, `${variable} = ${expresion}`);
}

const usaPandas = (codigo: string) => /\bpandas\b|\bpd\./.test(codigo);

// Los nombres del código (columnas, variables y valores de los datos) aparecen en el texto como código: se escriben
// sin tilde a propósito y el diccionario no los toca, como en SQL.
export function identificadoresPython(lecciones: LeccionPythonV1[]): Set<string> {
  const codigo = lecciones.map((leccion) => [leccion.setupCode, leccion.starterCode, ...(leccion.sections ?? []).map((seccion) => seccion.code)].join("\n")).join("\n");
  return new Set([...codigo.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)].map(([nombre]) => nombre.toLowerCase()));
}

export function convertirLeccionPython(v1: LeccionPythonV1, numero: number, excepto: ReadonlySet<string> = new Set()): Leccion {
  const texto = (valor: string) => corregirTildes(valor, excepto);
  const base = {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: Number.parseInt(v1.duration, 10) || 15,
    intro: (v1.intro ?? []).map(texto),
    sintaxis: v1.syntaxExample ? { lenguaje: "python" as const, codigo: v1.syntaxExample } : null,
    secciones: (v1.sections ?? []).map((seccion) => ({ titulo: texto(seccion.heading), parrafos: seccion.body.map(texto), ejemplo: null, codigo: seccion.code })),
  };
  if (v1.type === "reading") {
    if (!v1.prompt || !v1.explanation) throw new Error(`La lectura ${v1.slug} no tiene pregunta o respuesta`);
    return { ...base, tarea: { tipo: "LecturaTask", id: v1.slug, pregunta: texto(v1.prompt), respuesta: texto(v1.explanation) }, cierre: null };
  }
  if (!v1.prompt || v1.expectedValue === undefined) throw new Error(`La lección ${v1.slug} no tiene enunciado o valor esperado`);
  const variable = v1.resultVariable ?? "resultado";
  const preparacion = v1.setupCode ?? "";
  const inicial = v1.starterCode ?? "";
  return {
    ...base,
    tarea: {
      tipo: "PythonTask",
      id: v1.slug,
      enunciado: texto(v1.prompt),
      preparacion,
      inicial,
      // Sin la expresión en la explicación, la solución queda marcada para la revisión: el validador no la deja pasar.
      solucion: solucionPython(v1) ?? `${inicial}\n# REVISAR: escribir la solución`,
      pruebas: pruebaPython(variable, v1.expectedValue),
      paquetes: usaPandas(`${preparacion}\n${inicial}`) ? ["pandas"] : [],
      pistas: [],
    },
    cierre: v1.explanation ? texto(v1.explanation) : null,
  };
}
