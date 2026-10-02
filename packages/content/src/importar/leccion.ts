// Formato común de una lección importada desde un aula de la v1, y su escritura como MDX de la v2.
// Cada aula tiene su adaptador (aula-sql.ts, y después Excel, Python y Power BI) que llena este formato; el resto
// del camino (escribir el MDX, el caso.yaml y los datos) es el mismo para todas.
//
// Lo que sale de aquí es un borrador: después viene la revisión editorial (tildes que el diccionario no cubre, tono
// de tú, pistas que orientan sin dar la respuesta). El validador de contenido revisa que cada solución pase.

export type Seccion = { titulo: string; parrafos: string[]; ejemplo: string | null };

export type TareaSql = {
  tipo: "SqlTask";
  id: string;
  enunciado: string;
  inicial: string;
  solucion: string;
  comparar: "filas-en-orden" | "filas-sin-orden";
  pistas: string[];
};

export type Leccion = {
  slug: string;
  titulo: string;
  minutos: number;
  intro: string[];
  sintaxis: { lenguaje: "sql" | "python"; codigo: string } | null;
  secciones: Seccion[];
  tarea: TareaSql;
  // Se muestra al aprobar la lección: explica por qué la solución funciona.
  cierre: string | null;
};

// En el texto de MDX, «{» abre una expresión y «<» una etiqueta: se escriben como caracteres.
export function escaparTexto(texto: string): string {
  return texto.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;").replace(/</g, "&lt;");
}

// Los atributos van como expresión JavaScript ({"..."}): así pueden tener comillas y saltos de línea.
const atributo = (valor: string) => `{${JSON.stringify(valor)}}`;

function seccionMdx(seccion: Seccion): string {
  const partes = [`**${escaparTexto(seccion.titulo)}.** ${seccion.parrafos.map(escaparTexto).join(" ")}`];
  if (seccion.ejemplo) partes.push(`<SqlEjemplo consulta=${atributo(seccion.ejemplo)} />`);
  return partes.join("\n\n");
}

export function leccionAMdx(leccion: Leccion): string {
  const concepto = [
    ...leccion.intro.map(escaparTexto),
    ...(leccion.sintaxis ? [`<Sintaxis lenguaje="${leccion.sintaxis.lenguaje}" codigo=${atributo(leccion.sintaxis.codigo)} />`] : []),
    ...leccion.secciones.map(seccionMdx),
  ];
  const { tarea } = leccion;
  const lineas = [
    "---",
    `titulo: ${JSON.stringify(leccion.titulo)}`,
    `tiempo: ${leccion.minutos}`,
    "---",
    "",
    "<Concepto>",
    concepto.join("\n\n"),
    "</Concepto>",
    "",
    "<SqlTask",
    `  id="${tarea.id}"`,
    `  enunciado=${atributo(tarea.enunciado)}`,
    `  inicial=${atributo(tarea.inicial)}`,
    `  solucion=${atributo(tarea.solucion)}`,
    `  comparar="${tarea.comparar}"`,
    `  pistas={${JSON.stringify(tarea.pistas)}}`,
    "/>",
  ];
  if (leccion.cierre) lineas.push("", "<Debrief>", escaparTexto(leccion.cierre), "</Debrief>");
  return `${lineas.join("\n")}\n`;
}

// Tildes que faltan en los textos de la v1. Solo palabras sin ambigüedad («mas» puede ser «más» o «mas», y «practica»,
// verbo o sustantivo: quedan para la revisión). No se aplica a los nombres de tablas y columnas, que se escriben sin
// tilde a propósito.
const TILDES: Record<string, string> = {
  accion: "acción",
  ademas: "además",
  agregacion: "agregación",
  alfabetico: "alfabético",
  analisis: "análisis",
  analitica: "analítica",
  anio: "año",
  anios: "años",
  aqui: "aquí",
  aritmeticos: "aritméticos",
  basico: "básico",
  busqueda: "búsqueda",
  calculo: "cálculo",
  categoria: "categoría",
  cirugia: "cirugía",
  codigo: "código",
  como: "cómo",
  comun: "común",
  condicion: "condición",
  despues: "después",
  dia: "día",
  dias: "días",
  dificil: "difícil",
  dinamico: "dinámico",
  donde: "dónde",
  especifica: "específica",
  especificas: "específicas",
  evalua: "evalúa",
  expresion: "expresión",
  facil: "fácil",
  funcion: "función",
  informacion: "información",
  inscribio: "inscribió",
  inscripcion: "inscripción",
  leccion: "lección",
  logica: "lógica",
  manipulacion: "manipulación",
  maximo: "máximo",
  mayusculas: "mayúsculas",
  minimo: "mínimo",
  minusculas: "minúsculas",
  numerica: "numérica",
  numericas: "numéricas",
  numero: "número",
  numeros: "números",
  operacion: "operación",
  pagina: "página",
  quedarian: "quedarían",
  presentacion: "presentación",
  proximo: "próximo",
  rapido: "rápido",
  relacion: "relación",
  repeticion: "repetición",
  segun: "según",
  sesion: "sesión",
  tambien: "también",
  tendran: "tendrán",
  todavia: "todavía",
  ultima: "última",
  ultimo: "último",
  unica: "única",
  util: "útil",
  utiles: "útiles",
  vacia: "vacía",
  vacio: "vacío",
  valido: "válido",
};

// «como» y «donde» solo llevan tilde en preguntas o títulos: se corrigen al inicio del texto o después de «¿»
// (por ejemplo «Como pensarlo» → «Cómo pensarlo»). El resto de las palabras se corrige siempre.
const SOLO_AL_INICIO = new Set(["como", "donde"]);

// Frases fijas de las aulas de la v1 que el diccionario no puede corregir solo («que» lleva tilde solo en preguntas).
const FRASES: [RegExp, string][] = [[/\bPara que sirve\b/g, "Para qué sirve"]];

// El texto entre comillas simples es un valor de los datos ('Sin inscripcion', 'Santiago'): tiene que quedar igual
// que en la solución, así que no se corrige.
export function corregirTildes(texto: string, excepto: ReadonlySet<string> = new Set()): string {
  return texto
    .split(/('[^']*')/)
    .map((parte) => (parte.startsWith("'") ? parte : corregirTramo(parte, excepto)))
    .join("");
}

function corregirTramo(texto: string, excepto: ReadonlySet<string>): string {
  const conFrases = FRASES.reduce((actual, [patron, correcta]) => actual.replace(patron, correcta), texto);
  return conFrases.replace(/(^|[^\p{L}\p{N}_])([\p{L}]+)(?=$|[^\p{L}\p{N}_])/gu, (coincidencia, antes: string, palabra: string, desde: number) => {
    const minuscula = palabra.toLowerCase();
    const correcta = TILDES[minuscula];
    if (!correcta || excepto.has(minuscula)) return coincidencia;
    if (SOLO_AL_INICIO.has(minuscula) && !(desde === 0 || /¿\s*$/.test(conFrases.slice(0, desde + antes.length)))) return coincidencia;
    const conMayuscula = palabra[0] !== palabra[0].toLowerCase();
    return `${antes}${conMayuscula ? correcta[0].toUpperCase() + correcta.slice(1) : correcta}`;
  });
}
