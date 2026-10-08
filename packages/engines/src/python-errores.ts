import { sugerirNombre, type ErrorExplicado } from "./consola";

export type ContextoPython = { columnas?: string[]; archivos?: string[] };
type Explicacion = { mensaje: string; sugerencia: string | null };

const MODULOS = ["pandas", "numpy", "math", "statistics", "datetime", "json", "csv", "random", "re"];
const TIPOS: Record<string, string> = {
  DataFrame: "un DataFrame",
  Series: "una Series",
  str: "un texto (str)",
  int: "un número entero (int)",
  float: "un número decimal (float)",
  bool: "un valor lógico (bool)",
  list: "una lista",
  dict: "un diccionario",
  tuple: "una tupla",
  NoneType: "None (un valor vacío)",
};
const CIERRES: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

function nombreTipo(tipo: string): string {
  return TIPOS[tipo] ?? `un objeto de tipo ${tipo}`;
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function quizas(detalle: string): string | null {
  const nombre = /Did you mean: '([^']+)'\?/.exec(detalle)?.[1];
  return nombre ? `¿Quisiste decir «${nombre}»?` : null;
}

function sugerencia(nombre: string | null): string | null {
  return nombre ? `¿Quisiste decir «${nombre}»?` : null;
}

function sinComillas(texto: string): string {
  return texto.trim().replace(/^'(.*)'$/, "$1");
}

function sintaxis(detalle: string): Explicacion {
  const abierto = /'([([{])' was never closed/.exec(detalle)?.[1];
  if (abierto) return { mensaje: `Abriste «${abierto}» y nunca lo cerraste.`, sugerencia: `Agrega el «${CIERRES[abierto]}» que falta.` };
  const sobrante = /unmatched '([)\]}])'/.exec(detalle)?.[1];
  if (sobrante) {
    return { mensaje: `Sobra un «${sobrante}» que no tiene pareja.`, sugerencia: "Revisa que cada paréntesis o corchete que cierras lo hayas abierto antes." };
  }
  if (detalle.startsWith("unterminated string literal")) {
    return { mensaje: "Hay un texto sin la comilla de cierre.", sugerencia: "Cierra el texto con la misma comilla con que lo abriste: \"hola\" o 'hola'." };
  }
  if (detalle.startsWith("expected ':'")) {
    return { mensaje: "Falta «:» al final de la línea.", sugerencia: "Las líneas con if, elif, else, for, while y def terminan en dos puntos." };
  }
  if (detalle.includes("Maybe you meant '==' or ':=' instead of '='")) {
    return { mensaje: "Para comparar se usa «==»; «=» es para guardar un valor.", sugerencia: null };
  }
  if (detalle.includes("Perhaps you forgot a comma")) return { mensaje: "Python no entiende esta línea.", sugerencia: "¿Te falta una coma entre dos elementos?" };
  return { mensaje: "Python no entiende esta línea.", sugerencia: "Revisa paréntesis, comillas, comas y los dos puntos al final de if, for y def." };
}

function sangria(detalle: string): Explicacion {
  const bloque = /expected an indented block after (?:'(\w+)' statement|(function) definition)/.exec(detalle);
  if (bloque) {
    const palabra = bloque[1] ?? "def";
    return { mensaje: `Después de la línea con «${palabra}» falta un bloque con sangría.`, sugerencia: `Deja 4 espacios al inicio de las líneas que van dentro del ${palabra}.` };
  }
  if (detalle.startsWith("unexpected indent")) {
    return { mensaje: "Esta línea tiene una sangría que no corresponde.", sugerencia: "Quita los espacios del inicio o alinéala con el bloque al que pertenece." };
  }
  if (detalle.startsWith("unindent does not match")) {
    return { mensaje: "La sangría de esta línea no coincide con las anteriores.", sugerencia: "Usa siempre 4 espacios por nivel." };
  }
  return { mensaje: "La sangría (los espacios al inicio de la línea) no es correcta.", sugerencia: "Usa 4 espacios por nivel." };
}

const SIN_PARENTESIS = "Pon cada condición entre paréntesis: (tabla[\"cantidad\"] >= 3) & (tabla[\"estado\"] == \"entregado\").";

function tipos(detalle: string): Explicacion {
  if (/Cannot perform '(?:r?and_|r?or_)' with a dtyped/.test(detalle) || /unsupported operand type\(s\) for [&|]/.test(detalle)) {
    return { mensaje: "Combinaste condiciones con & o | sin paréntesis.", sugerencia: SIN_PARENTESIS };
  }
  const concatenar = /can only concatenate str \(not "(\w+)"\) to str/.exec(detalle)?.[1];
  if (concatenar === "int" || concatenar === "float") {
    return { mensaje: "No puedes unir un texto con un número usando «+».", sugerencia: 'Convierte el número con str(...) o usa un f-string: f"Total: {total}".' };
  }
  const operacion = /unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/.exec(detalle);
  if (operacion) {
    return {
      mensaje: `No se puede usar «${operacion[1]}» entre ${nombreTipo(operacion[2])} y ${nombreTipo(operacion[3])}.`,
      sugerencia: "Revisa los tipos: quizás un número quedó guardado como texto. Conviértelo con int() o float().",
    };
  }
  const llamada = /'(\w+)' object is not callable/.exec(detalle)?.[1];
  if (llamada) {
    return {
      mensaje: `${conMayuscula(nombreTipo(llamada))} no es una función: no lleva paréntesis después.`,
      sugerencia: "Quita los paréntesis, o revisa si le pusiste a una variable el nombre de una función (por ejemplo, sum = 10).",
    };
  }
  const faltan = /(\w+)\(\) missing \d+ required positional arguments?: (.+)$/.exec(detalle);
  if (faltan) {
    const parametros = faltan[2].replace(/'(\w+)'/g, "«$1»").replace(" and ", " y ");
    return {
      mensaje: `Llamaste a «${faltan[1]}» sin el valor de ${parametros}.`,
      sugerencia: `Pasa un valor por cada parámetro entre los paréntesis. Si se la estás dando a apply, va sin paréntesis: apply(${faltan[1]}).`,
    };
  }
  const sobran = /(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/.exec(detalle);
  if (sobran) {
    return {
      mensaje: `«${sobran[1]}» recibe ${sobran[2]} ${sobran[2] === "1" ? "valor" : "valores"}, pero le pasaste ${sobran[3]}.`,
      sugerencia: "Revisa cuántos parámetros definiste con def y cuántos valores pasas al llamarla.",
    };
  }
  const corchetes = /'(\w+)' object is not subscriptable/.exec(detalle)?.[1];
  if (corchetes) return { mensaje: `${conMayuscula(nombreTipo(corchetes))} no se puede leer con corchetes [].`, sugerencia: null };
  return { mensaje: "Estás combinando tipos de datos o argumentos que no son compatibles.", sugerencia: null };
}

type Regla = (detalle: string, contexto: ContextoPython) => Explicacion | null;

const REGLAS: Record<string, Regla> = {
  NameError: (detalle) => {
    const nombre = /name '([^']+)' is not defined/.exec(detalle)?.[1];
    if (!nombre) return null;
    return {
      mensaje: `No existe nada llamado «${nombre}».`,
      sugerencia: quizas(detalle) ?? "Revisa que lo hayas creado antes de usarlo y que esté bien escrito: Python distingue mayúsculas y minúsculas.",
    };
  },
  KeyError: (detalle, { columnas = [] }) => {
    const clave = sinComillas(detalle);
    return {
      mensaje: `No existe la columna o clave «${clave}».`,
      sugerencia: sugerencia(sugerirNombre(clave, columnas)) ?? (columnas.length ? `Las columnas de los datos del caso son: ${columnas.join(", ")}.` : null),
    };
  },
  AttributeError: (detalle) => {
    const coincidencia = /'(\w+)' object has no attribute '([^']+)'/.exec(detalle);
    if (!coincidencia) return null;
    const [, tipo, atributo] = coincidencia;
    if (tipo === "NoneType") {
      return {
        mensaje: `Intentaste usar «.${atributo}» sobre None (un valor vacío).`,
        sugerencia: "Revisa la línea donde le diste valor a esa variable: quizás una función no devolvió nada.",
      };
    }
    return {
      mensaje: `${conMayuscula(nombreTipo(tipo))} no tiene nada llamado «${atributo}».`,
      sugerencia: quizas(detalle) ?? "Revisa el nombre: Python distingue mayúsculas y minúsculas.",
    };
  },
  SyntaxError: sintaxis,
  IndentationError: sangria,
  TabError: () => ({ mensaje: "Mezclaste tabulaciones y espacios en la sangría.", sugerencia: "Usa solo espacios: 4 por nivel." }),
  TypeError: tipos,
  ZeroDivisionError: () => ({ mensaje: "Estás dividiendo por cero.", sugerencia: "Revisa que el divisor no valga 0 antes de dividir." }),
  FileNotFoundError: (detalle, { archivos = [] }) => {
    const ruta = /'([^']+)'$/.exec(detalle)?.[1] ?? "";
    return {
      mensaje: `No existe el archivo «${ruta}».`,
      sugerencia: sugerencia(sugerirNombre(ruta, archivos)) ?? (archivos.length ? `Los archivos del caso son: ${archivos.join(", ")}.` : null),
    };
  },
  ModuleNotFoundError: (detalle) => {
    const modulo = /No module named '([^']+)'/.exec(detalle)?.[1] ?? "";
    return { mensaje: `No existe el módulo «${modulo}».`, sugerencia: sugerencia(sugerirNombre(modulo, MODULOS)) };
  },
  IndexError: (detalle) =>
    detalle.includes("out-of-bounds")
      ? { mensaje: "Pediste con iloc una posición que no existe.", sugerencia: "Las posiciones parten en 0: en una tabla de 5 filas, la última es la 4." }
      : { mensaje: "Pediste una posición que no existe.", sugerencia: "Las posiciones parten en 0: en una lista de 3 elementos, la última es la 2." },
  ValueError: (detalle) => {
    if (detalle.startsWith("The truth value of a")) {
      return {
        mensaje: "Usaste and, or o un if con una columna completa.",
        sugerencia: "Para combinar condiciones fila por fila, pandas usa & (y) y | (o), con cada condición entre paréntesis.",
      };
    }
    const entero = /invalid literal for int\(\) with base 10: (.+)$/.exec(detalle)?.[1];
    if (entero) return { mensaje: `No se puede convertir «${sinComillas(entero)}» en un número entero.`, sugerencia: "int() solo convierte textos con dígitos, como '42'." };
    const decimal = /could not convert string to float: (.+)$/.exec(detalle)?.[1];
    if (decimal) return { mensaje: `No se puede convertir «${sinComillas(decimal)}» en un número decimal.`, sugerencia: "float() usa punto decimal: '3.5', no '3,5'." };
    return { mensaje: "Un valor no tiene la forma que se esperaba.", sugerencia: null };
  },
  AssertionError: (detalle) => ({
    mensaje: detalle ? `Una verificación (assert) no se cumplió: ${detalle}` : "Una verificación (assert) no se cumplió.",
    sugerencia: null,
  }),
};

function ultimaLinea(traceback: string): string {
  return traceback.split("\n").map((linea) => linea.trim()).filter(Boolean).at(-1) ?? traceback;
}

function lineaDelCodigo(traceback: string): number | null {
  const coincidencia = [...traceback.matchAll(/File "<exec>", line (\d+)/g)].at(-1);
  return coincidencia ? Number(coincidencia[1]) : null;
}

export function explicarErrorPython(traceback: string, contexto: ContextoPython = {}): ErrorExplicado {
  const original = ultimaLinea(traceback);
  const partes = /^(\w+)(?::\s*(.*))?$/.exec(original);
  const explicacion = (partes && REGLAS[partes[1]]?.(partes[2] ?? "", contexto)) ?? {
    mensaje: "Tu código se detuvo por un error.",
    sugerencia: "Lee el mensaje original: la última línea dice qué tipo de error ocurrió.",
  };
  return { ...explicacion, linea: lineaDelCodigo(traceback), original };
}
