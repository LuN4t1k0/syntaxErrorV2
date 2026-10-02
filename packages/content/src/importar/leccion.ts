// Formato común de una lección importada desde un aula de la v1, y su escritura como MDX de la v2.
// Cada aula tiene su adaptador (aula-sql.ts, y después Excel, Python y Power BI) que llena este formato; el resto
// del camino (escribir el MDX, el caso.yaml y los datos) es el mismo para todas.
//
// Lo que sale de aquí es un borrador: después viene la revisión editorial (tildes que el diccionario no cubre, tono
// de tú, pistas que orientan sin dar la respuesta). El validador de contenido revisa que cada solución pase.

// Una sección del concepto: párrafos y, si la tiene, una consulta que se puede probar (ejemplo), una fórmula de
// planilla que solo se muestra (formula) o código de Python que solo se muestra (codigo), porque usa los datos de la
// preparación de la tarea.
export type Seccion = { titulo: string; parrafos: string[]; ejemplo: string | null; formula?: string | null; codigo?: string | null; lenguaje?: string; lista?: string[] };

// Una práctica fuera de la plataforma (por ejemplo, en Power BI Desktop): qué se hace, los pasos y el archivo de datos.
export type Practica = { enunciado: string; pasos: string[]; datos: { nombre: string; enlace: string } | null };

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

// Un quiz de opción única: se aprueba con todas las respuestas correctas.
export type TareaQuiz = {
  tipo: "QuizTask";
  id: string;
  preguntas: { pregunta: string; opciones: string[]; correcta: number; explicacion: string }[];
  pistas: string[];
};

export type Tarea = TareaSql | TareaHoja | TareaPython | TareaLectura | TareaQuiz;

export type Leccion = {
  slug: string;
  titulo: string;
  minutos: number;
  intro: string[];
  sintaxis: { lenguaje: "sql" | "python" | "planilla"; codigo: string } | null;
  secciones: Seccion[];
  practica?: Practica | null;
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
  const partes = [[`**${escaparTexto(seccion.titulo)}.**`, ...seccion.parrafos.map(escaparTexto)].join(" ")];
  if (seccion.lista?.length) partes.push(seccion.lista.map((item) => `- ${escaparTexto(item)}`).join("\n"));
  if (seccion.ejemplo) partes.push(`<SqlEjemplo consulta=${atributo(seccion.ejemplo)} />`);
  if (seccion.formula) partes.push(`<Sintaxis lenguaje="planilla" codigo=${atributo(seccion.formula)} />`);
  // Un bloque de código de MDX se muestra tal cual: no necesita escaparse.
  if (seccion.codigo) partes.push([`\`\`\`${seccion.lenguaje ?? "python"}`, seccion.codigo, "```"].join("\n"));
  return partes.join("\n\n");
}

function practicaMdx(practica: Practica): string {
  const datos = practica.datos ? ` Los datos están en [${practica.datos.nombre}](${practica.datos.enlace}), también en «Datos del caso» de estas clases.` : "";
  return [`**Práctica.** ${escaparTexto(practica.enunciado)}${datos}`, practica.pasos.map((paso, indice) => `${indice + 1}. ${escaparTexto(paso)}`).join("\n")].join("\n\n");
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
    case "QuizTask":
      return ["<QuizTask", `  id="${tarea.id}"`, `  preguntas={${JSON.stringify(tarea.preguntas)}}`, `  pistas={${JSON.stringify(tarea.pistas)}}`, "/>"];
    case "LecturaTask":
      return ["<LecturaTask", `  id="${tarea.id}"`, `  pregunta=${atributo(tarea.pregunta)}`, `  respuesta=${atributo(tarea.respuesta)}`, "/>"];
  }
}

export function leccionAMdx(leccion: Leccion): string {
  const concepto = [
    ...leccion.intro.map(escaparTexto),
    ...(leccion.sintaxis ? [`<Sintaxis lenguaje="${leccion.sintaxis.lenguaje}" codigo=${atributo(leccion.sintaxis.codigo)} />`] : []),
    ...leccion.secciones.map(seccionMdx),
    ...(leccion.practica ? [practicaMdx(leccion.practica)] : []),
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
  agrupacion: "agrupación",
  ahi: "ahí",
  alfabetico: "alfabético",
  analisis: "análisis",
  analitica: "analítica",
  anio: "año",
  anios: "años",
  anonimizacion: "anonimización",
  antiguedad: "antigüedad",
  aparicion: "aparición",
  aplicacion: "aplicación",
  aplicala: "aplícala",
  aqui: "aquí",
  area: "área",
  areas: "áreas",
  aritmetica: "aritmética",
  aritmeticos: "aritméticos",
  asi: "así",
  asignacion: "asignación",
  automaticamente: "automáticamente",
  automaticas: "automáticas",
  automaticos: "automáticos",
  autorizacion: "autorización",
  basica: "básica",
  basicas: "básicas",
  basico: "básico",
  basicos: "básicos",
  botin: "botín",
  boton: "botón",
  busqueda: "búsqueda",
  calculo: "cálculo",
  calculos: "cálculos",
  categoria: "categoría",
  categorias: "categorías",
  categoricas: "categóricas",
  cirugia: "cirugía",
  clasificacion: "clasificación",
  codigo: "código",
  codigos: "códigos",
  coleccion: "colección",
  combinacion: "combinación",
  como: "cómo",
  comodo: "cómodo",
  comparacion: "comparación",
  comprobacion: "comprobación",
  comun: "común",
  conclusion: "conclusión",
  condicion: "condición",
  conexion: "conexión",
  configuracion: "configuración",
  confirmacion: "confirmación",
  contraccion: "contracción",
  conversion: "conversión",
  corrigelo: "corrígelo",
  critico: "crítico",
  criticos: "críticos",
  cupon: "cupón",
  deberia: "debería",
  deberian: "deberían",
  decision: "decisión",
  definicion: "definición",
  desafio: "desafío",
  descripcion: "descripción",
  despues: "después",
  devolucion: "devolución",
  dia: "día",
  diagnostico: "diagnóstico",
  dias: "días",
  diciendote: "diciéndote",
  dificil: "difícil",
  dimension: "dimensión",
  dinamica: "dinámica",
  dinamicas: "dinámicas",
  dinamico: "dinámico",
  direccion: "dirección",
  dispersion: "dispersión",
  distribucion: "distribución",
  division: "división",
  dolar: "dólar",
  dolio: "dolió",
  donde: "dónde",
  edicion: "edición",
  ejecucion: "ejecución",
  ejecutalo: "ejecútalo",
  eleccion: "elección",
  especifica: "específica",
  especificas: "específicas",
  estadistica: "estadística",
  estatica: "estática",
  estatico: "estático",
  evalua: "evalúa",
  evolucion: "evolución",
  existia: "existía",
  explicacion: "explicación",
  explicita: "explícita",
  explicitamente: "explícitamente",
  exploracion: "exploración",
  exposicion: "exposición",
  expresion: "expresión",
  facil: "fácil",
  formula: "fórmula",
  formulas: "fórmulas",
  funcion: "función",
  grafico: "gráfico",
  graficos: "gráficos",
  guia: "guía",
  harias: "harías",
  identica: "idéntica",
  incluyendote: "incluyéndote",
  indice: "índice",
  informacion: "información",
  inscribio: "inscribió",
  inscripcion: "inscripción",
  instalacion: "instalación",
  instruccion: "instrucción",
  intentaria: "intentaría",
  interaccion: "interacción",
  interpretacion: "interpretación",
  interseccion: "intersección",
  intuicion: "intuición",
  inutil: "inútil",
  jerarquia: "jerarquía",
  jerarquias: "jerarquías",
  jerarquicos: "jerárquicos",
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
  metrica: "métrica",
  metricas: "métricas",
  minimizacion: "minimización",
  minimo: "mínimo",
  minusculas: "minúsculas",
  mision: "misión",
  moderacion: "moderación",
  muestrame: "muéstrame",
  multiples: "múltiples",
  normalizacion: "normalización",
  numerica: "numérica",
  numericas: "numéricas",
  numero: "número",
  numeros: "números",
  obligaria: "obligaría",
  observacion: "observación",
  ocurrio: "ocurrió",
  operacion: "operación",
  origenes: "orígenes",
  pagina: "página",
  parentesis: "paréntesis",
  patron: "patrón",
  pelicula: "película",
  pesaria: "pesaría",
  pestana: "pestaña",
  pestanas: "pestañas",
  piensalo: "piénsalo",
  podria: "podría",
  porcion: "porción",
  posicion: "posición",
  precision: "precisión",
  presentacion: "presentación",
  produccion: "producción",
  proporcion: "proporción",
  proxima: "próxima",
  proximo: "próximo",
  quedarian: "quedarían",
  quedate: "quédate",
  rapida: "rápida",
  rapido: "rápido",
  razon: "razón",
  recomendacion: "recomendación",
  region: "región",
  relacion: "relación",
  repeticion: "repetición",
  revision: "revisión",
  sabras: "sabrás",
  sangria: "sangría",
  seccion: "sección",
  segmentacion: "segmentación",
  segun: "según",
  seleccion: "selección",
  semaforo: "semáforo",
  sesion: "sesión",
  simultanea: "simultánea",
  sistematicos: "sistemáticos",
  solucion: "solución",
  subexpresion: "subexpresión",
  suposicion: "suposición",
  tambien: "también",
  taxonomia: "taxonomía",
  tecnica: "técnica",
  tecnicamente: "técnicamente",
  telefonicos: "telefónicos",
  tendran: "tendrán",
  tenias: "tenías",
  teoria: "teoría",
  tipicamente: "típicamente",
  tipico: "típico",
  tipicos: "típicos",
  tipografia: "tipografía",
  todavia: "todavía",
  transformacion: "transformación",
  trio: "trío",
  ultima: "última",
  ultimo: "último",
  unica: "única",
  unicas: "únicas",
  unico: "único",
  usarias: "usarías",
  util: "útil",
  utiles: "útiles",
  vacia: "vacía",
  vacio: "vacío",
  validacion: "validación",
  valido: "válido",
  vendio: "vendió",
  verificacion: "verificación",
  version: "versión",
  visualizacion: "visualización",
};

// «como» y «donde» solo llevan tilde en preguntas o títulos: se corrigen al inicio del texto o después de «¿»
// (por ejemplo «Como pensarlo» → «Cómo pensarlo»). El resto de las palabras se corrige siempre.
const SOLO_AL_INICIO = new Set(["como", "donde"]);

// Frases fijas de las aulas de la v1 que el diccionario no puede corregir solo («que» lleva tilde solo en preguntas), y
// el voseo de algunas aulas: el texto trata de tú (las formas en -ar sin tilde, como «carga», ya son de tú).
const FRASES: [RegExp, string][] = [
  [/\bPara que sirve\b/g, "Para qué sirve"],
  [/\b(por|para) vos\b/g, "$1 ti"],
  [/\bcon vos\b/g, "contigo"],
  [/\b([Hh])ace clic\b/g, "$1az clic"],
  [/\bAnda a\b/g, "Ve a"],
];

// Formas del voseo que no se confunden con otra palabra, y su forma con tú.
const VOSEO: Record<string, string> = {
  abri: "abre",
  acordate: "acuérdate",
  asegurate: "asegúrate",
  descargalo: "descárgalo",
  elegi: "elige",
  escribi: "escribe",
  fijate: "fíjate",
  podes: "puedes",
  queres: "quieres",
  seleccioná: "selecciona",
  segui: "sigue",
  tenes: "tienes",
  volve: "vuelve",
};

// El texto entre comillas simples es un valor de los datos ('Sin inscripcion', 'Santiago'): tiene que quedar igual
// que en la solución, así que no se corrige. En Power BI, en cambio, las comillas encierran nombres de menús
// ('Segmentación de datos'), que sí se corrigen: ahí se pasa { respetarComillas: false }.
export function corregirTildes(texto: string, excepto: ReadonlySet<string> = new Set(), { respetarComillas = true } = {}): string {
  if (!respetarComillas) return corregirTramo(texto, excepto);
  return texto
    .split(/('[^']*')/)
    .map((parte) => (parte.startsWith("'") ? parte : corregirTramo(parte, excepto)))
    .join("");
}

function corregirTramo(texto: string, excepto: ReadonlySet<string>): string {
  const conFrases = FRASES.reduce((actual, [patron, correcta]) => actual.replace(patron, correcta), texto);
  return conFrases.replace(/(^|[^\p{L}\p{N}_])([\p{L}]+)(?=$|[^\p{L}\p{N}_])/gu, (coincidencia, antes: string, palabra: string, desde: number) => {
    const minuscula = palabra.toLowerCase();
    const correcta = TILDES[minuscula] ?? VOSEO[minuscula];
    if (!correcta || excepto.has(minuscula)) return coincidencia;
    if (SOLO_AL_INICIO.has(minuscula) && !(desde === 0 || /¿\s*$/.test(conFrases.slice(0, desde + antes.length)))) return coincidencia;
    const conMayuscula = palabra[0] !== palabra[0].toLowerCase();
    return `${antes}${conMayuscula ? correcta[0].toUpperCase() + correcta.slice(1) : correcta}`;
  });
}
