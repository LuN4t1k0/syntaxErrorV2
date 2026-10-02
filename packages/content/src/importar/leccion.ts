// Formato común de una lección importada desde un aula de la v1, y su escritura como MDX de la v2.
// Cada aula tiene su adaptador (aula-sql.ts, y después Excel, Python y Power BI) que llena este formato; el resto
// del camino (escribir el MDX, el caso.yaml y los datos) es el mismo para todas.
//
// Lo que sale de aquí es un borrador: después viene la revisión editorial (tildes que el diccionario no cubre, tono
// de tú, pistas que orientan sin dar la respuesta). El validador de contenido revisa que cada solución pase.

// Una sección del concepto: párrafos y, si la tiene, una consulta que se puede probar (ejemplo), una fórmula de
// planilla que solo se muestra (formula) o código de Python que solo se muestra (codigo), porque usa los datos de la
// preparación de la tarea.
export type Seccion = { titulo: string; parrafos: string[]; ejemplo: string | null; formula?: string | null; codigo?: string | null };

export type TareaSql = {
  tipo: "SqlTask";
  id: string;
  enunciado: string;
  inicial: string;
  solucion: string;
  comparar: "filas-en-orden" | "filas-sin-orden";
  pistas: string[];
};

export type Celda = string | number | null;

export type TareaHoja = {
  tipo: "SheetTask";
  id: string;
  enunciado: string;
  // La planilla de la lección, fila por fila desde A1.
  grilla: Celda[][];
  celdas: { celda: string; valor: string | number }[];
  solucion: Record<string, string | number>;
  pistas: string[];
};

export type TareaPython = {
  tipo: "PythonTask";
  id: string;
  enunciado: string;
  preparacion: string;
  inicial: string;
  solucion: string;
  pruebas: string;
  paquetes: "pandas"[];
  pistas: string[];
};

// Una lección de lectura: una pregunta para pensar y la respuesta del curso.
export type TareaLectura = { tipo: "LecturaTask"; id: string; pregunta: string; respuesta: string };

export type Tarea = TareaSql | TareaHoja | TareaPython | TareaLectura;

export type Leccion = {
  slug: string;
  titulo: string;
  minutos: number;
  intro: string[];
  sintaxis: { lenguaje: "sql" | "python" | "planilla"; codigo: string } | null;
  secciones: Seccion[];
  tarea: Tarea;
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
  if (seccion.formula) partes.push(`<Sintaxis lenguaje="planilla" codigo=${atributo(seccion.formula)} />`);
  // Un bloque de código de MDX se muestra tal cual: no necesita escaparse.
  if (seccion.codigo) partes.push(["```python", seccion.codigo, "```"].join("\n"));
  return partes.join("\n\n");
}

function tareaMdx(tarea: Tarea): string[] {
  switch (tarea.tipo) {
    case "SqlTask":
      return [
        "<SqlTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  inicial=${atributo(tarea.inicial)}`,
        `  solucion=${atributo(tarea.solucion)}`,
        `  comparar="${tarea.comparar}"`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "SheetTask":
      return [
        "<SheetTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  grilla={${JSON.stringify(tarea.grilla)}}`,
        `  celdas={${JSON.stringify(tarea.celdas)}}`,
        `  solucion={${JSON.stringify(tarea.solucion)}}`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "PythonTask":
      return [
        "<PythonTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  preparacion=${atributo(tarea.preparacion)}`,
        `  inicial=${atributo(tarea.inicial)}`,
        `  solucion=${atributo(tarea.solucion)}`,
        `  pruebas=${atributo(tarea.pruebas)}`,
        `  paquetes={${JSON.stringify(tarea.paquetes)}}`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "LecturaTask":
      return ["<LecturaTask", `  id="${tarea.id}"`, `  pregunta=${atributo(tarea.pregunta)}`, `  respuesta=${atributo(tarea.respuesta)}`, "/>"];
  }
}

export function leccionAMdx(leccion: Leccion): string {
  const concepto = [
    ...leccion.intro.map(escaparTexto),
    ...(leccion.sintaxis ? [`<Sintaxis lenguaje="${leccion.sintaxis.lenguaje}" codigo=${atributo(leccion.sintaxis.codigo)} />`] : []),
    ...leccion.secciones.map(seccionMdx),
  ];
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
    ...tareaMdx(leccion.tarea),
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
  ahi: "ahí",
  alfabetico: "alfabético",
  analisis: "análisis",
  analitica: "analítica",
  anio: "año",
  anios: "años",
  antiguedad: "antigüedad",
  aparicion: "aparición",
  aplicala: "aplícala",
  aqui: "aquí",
  area: "área",
  aritmetica: "aritmética",
  aritmeticos: "aritméticos",
  asi: "así",
  automaticamente: "automáticamente",
  automaticos: "automáticos",
  basica: "básica",
  basico: "básico",
  basicos: "básicos",
  botin: "botín",
  busqueda: "búsqueda",
  calculo: "cálculo",
  calculos: "cálculos",
  categoria: "categoría",
  categorias: "categorías",
  categoricas: "categóricas",
  cirugia: "cirugía",
  codigo: "código",
  codigos: "códigos",
  coleccion: "colección",
  como: "cómo",
  comodo: "cómodo",
  comparacion: "comparación",
  comun: "común",
  condicion: "condición",
  configuracion: "configuración",
  contraccion: "contracción",
  conversion: "conversión",
  corrigelo: "corrígelo",
  critico: "crítico",
  criticos: "críticos",
  cupon: "cupón",
  deberia: "debería",
  deberian: "deberían",
  decision: "decisión",
  desafio: "desafío",
  descripcion: "descripción",
  despues: "después",
  dia: "día",
  diagnostico: "diagnóstico",
  dias: "días",
  diciendote: "diciéndote",
  dificil: "difícil",
  dinamica: "dinámica",
  dinamicas: "dinámicas",
  dinamico: "dinámico",
  direccion: "dirección",
  distribucion: "distribución",
  division: "división",
  dolar: "dólar",
  dolio: "dolió",
  donde: "dónde",
  edicion: "edición",
  ejecutalo: "ejecútalo",
  eleccion: "elección",
  especifica: "específica",
  especificas: "específicas",
  evalua: "evalúa",
  evolucion: "evolución",
  existia: "existía",
  exploracion: "exploración",
  expresion: "expresión",
  facil: "fácil",
  formula: "fórmula",
  formulas: "fórmulas",
  funcion: "función",
  grafico: "gráfico",
  graficos: "gráficos",
  harias: "harías",
  identica: "idéntica",
  incluyendote: "incluyéndote",
  indice: "índice",
  informacion: "información",
  inscribio: "inscribió",
  inscripcion: "inscripción",
  instruccion: "instrucción",
  intentaria: "intentaría",
  interseccion: "intersección",
  leccion: "lección",
  libreria: "librería",
  linea: "línea",
  lineas: "líneas",
  logica: "lógica",
  logicos: "lógicos",
  manipulacion: "manipulación",
  margenes: "márgenes",
  mascara: "máscara",
  matematicas: "matemáticas",
  maximo: "máximo",
  mayoria: "mayoría",
  mayusculas: "mayúsculas",
  mecanicos: "mecánicos",
  minimo: "mínimo",
  minusculas: "minúsculas",
  mision: "misión",
  muestrame: "muéstrame",
  multiples: "múltiples",
  numerica: "numérica",
  numericas: "numéricas",
  numero: "número",
  numeros: "números",
  ocurrio: "ocurrió",
  operacion: "operación",
  pagina: "página",
  parentesis: "paréntesis",
  patron: "patrón",
  pelicula: "película",
  piensalo: "piénsalo",
  posicion: "posición",
  presentacion: "presentación",
  proxima: "próxima",
  proximo: "próximo",
  quedarian: "quedarían",
  quedate: "quédate",
  rapida: "rápida",
  rapido: "rápido",
  region: "región",
  relacion: "relación",
  repeticion: "repetición",
  sangria: "sangría",
  segun: "según",
  semaforo: "semáforo",
  sesion: "sesión",
  simultanea: "simultánea",
  solucion: "solución",
  tambien: "también",
  tendran: "tendrán",
  tenias: "tenías",
  tipico: "típico",
  todavia: "todavía",
  transformacion: "transformación",
  trio: "trío",
  ultima: "última",
  ultimo: "último",
  unica: "única",
  unicas: "únicas",
  unico: "único",
  util: "útil",
  utiles: "útiles",
  vacia: "vacía",
  vacio: "vacío",
  valido: "válido",
  vendio: "vendió",
  version: "versión",
  visualizacion: "visualización",
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
