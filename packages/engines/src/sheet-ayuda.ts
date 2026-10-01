import { HyperFormula } from "hyperformula";
import esES from "hyperformula/i18n/languages/esES";
import { sugerirNombre, type ErrorExplicado } from "./consola";

// Mismo registro que sheet.ts (es idempotente): así este módulo no depende de sheet.ts.
if (!HyperFormula.getRegisteredLanguagesCodes().includes("esES")) {
  HyperFormula.registerLanguage("esES", esES);
}

export type AyudaFuncion = { nombre: string; sintaxis: string; descripcion: string; ejemplo: string };

// Las que usa la ruta Data Analyst, con separador «;» como en Excel en español.
export const AYUDA_FUNCIONES: AyudaFuncion[] = [
  { nombre: "SUMA", sintaxis: "SUMA(número1; [número2]; …)", descripcion: "Suma todos los números de los rangos o valores.", ejemplo: "=SUMA(C2:C4)" },
  { nombre: "SUMAR.SI", sintaxis: "SUMAR.SI(rango; criterio; [rango_suma])", descripcion: "Suma solo las filas que cumplen el criterio.", ejemplo: '=SUMAR.SI(B2:B4; "Temuco"; C2:C4)' },
  { nombre: "SUMAPRODUCTO", sintaxis: "SUMAPRODUCTO(matriz1; [matriz2]; …)", descripcion: "Multiplica los rangos fila a fila y suma los resultados.", ejemplo: "=SUMAPRODUCTO(A2:A4; C2:C4)" },
  { nombre: "PROMEDIO", sintaxis: "PROMEDIO(número1; [número2]; …)", descripcion: "Calcula el promedio de los números.", ejemplo: "=PROMEDIO(C2:C4)" },
  { nombre: "PROMEDIO.SI", sintaxis: "PROMEDIO.SI(rango; criterio; [rango_promedio])", descripcion: "Promedia solo las filas que cumplen el criterio.", ejemplo: '=PROMEDIO.SI(B2:B4; "Temuco"; C2:C4)' },
  { nombre: "CONTAR", sintaxis: "CONTAR(valor1; [valor2]; …)", descripcion: "Cuenta las celdas que tienen números.", ejemplo: "=CONTAR(C2:C4)" },
  { nombre: "CONTARA", sintaxis: "CONTARA(valor1; [valor2]; …)", descripcion: "Cuenta las celdas que no están vacías.", ejemplo: "=CONTARA(B2:B4)" },
  { nombre: "CONTAR.SI", sintaxis: "CONTAR.SI(rango; criterio)", descripcion: "Cuenta las celdas del rango que cumplen el criterio.", ejemplo: '=CONTAR.SI(B2:B4; "Temuco")' },
  { nombre: "MAX", sintaxis: "MAX(número1; [número2]; …)", descripcion: "Devuelve el número más grande.", ejemplo: "=MAX(C2:C4)" },
  { nombre: "MIN", sintaxis: "MIN(número1; [número2]; …)", descripcion: "Devuelve el número más pequeño.", ejemplo: "=MIN(C2:C4)" },
  { nombre: "REDONDEAR", sintaxis: "REDONDEAR(número; decimales)", descripcion: "Redondea un número a los decimales que indiques.", ejemplo: "=REDONDEAR(PROMEDIO(C2:C4); 0)" },
  { nombre: "ENTERO", sintaxis: "ENTERO(número)", descripcion: "Quita los decimales, redondeando hacia abajo.", ejemplo: "=ENTERO(C2/7)" },
  { nombre: "ABS", sintaxis: "ABS(número)", descripcion: "Devuelve el número sin signo.", ejemplo: "=ABS(C2-C3)" },
  { nombre: "SI", sintaxis: "SI(prueba_lógica; valor_si_verdadero; [valor_si_falso])", descripcion: "Devuelve un valor si la condición se cumple y otro si no.", ejemplo: '=SI(C2>100000; "grande"; "normal")' },
  { nombre: "SI.ERROR", sintaxis: "SI.ERROR(valor; valor_si_error)", descripcion: "Devuelve otro valor si la fórmula da error.", ejemplo: "=SI.ERROR(C2/0; 0)" },
  { nombre: "SI.CONJUNTO", sintaxis: "SI.CONJUNTO(prueba1; valor1; [prueba2; valor2]; …)", descripcion: "Revisa varias condiciones en orden y devuelve el valor de la primera que se cumple.", ejemplo: '=SI.CONJUNTO(C2>100000; "alto"; C2>60000; "medio"; VERDADERO(); "bajo")' },
  { nombre: "Y", sintaxis: "Y(lógico1; [lógico2]; …)", descripcion: "Es VERDADERO si se cumplen todas las condiciones.", ejemplo: '=Y(C2>40000; B2="Temuco")' },
  { nombre: "O", sintaxis: "O(lógico1; [lógico2]; …)", descripcion: "Es VERDADERO si se cumple al menos una condición.", ejemplo: '=O(B2="Temuco"; B2="Talca")' },
  { nombre: "BUSCARV", sintaxis: "BUSCARV(valor_buscado; rango; columna; [ordenado])", descripcion: "Busca un valor en la primera columna del rango y devuelve el de otra columna. Usa FALSO() para coincidencia exacta.", ejemplo: "=BUSCARV(102; A2:C4; 3; FALSO())" },
  { nombre: "BUSCARX", sintaxis: "BUSCARX(valor_buscado; rango_búsqueda; rango_resultado)", descripcion: "Busca un valor en un rango y devuelve el de la misma posición en otro.", ejemplo: "=BUSCARX(102; A2:A4; C2:C4)" },
  { nombre: "COINCIDIR", sintaxis: "COINCIDIR(valor_buscado; rango; [tipo])", descripcion: "Devuelve la posición de un valor dentro de un rango. Usa 0 para coincidencia exacta.", ejemplo: "=COINCIDIR(102; A2:A4; 0)" },
  { nombre: "INDICE", sintaxis: "INDICE(rango; fila; [columna])", descripcion: "Devuelve el valor de una posición del rango.", ejemplo: "=INDICE(C2:C4; 2)" },
  { nombre: "CONCATENAR", sintaxis: "CONCATENAR(texto1; [texto2]; …)", descripcion: "Une varios textos en uno.", ejemplo: '=CONCATENAR(B2; " - "; A2)' },
  { nombre: "IZQUIERDA", sintaxis: "IZQUIERDA(texto; [cantidad])", descripcion: "Toma los primeros caracteres de un texto.", ejemplo: "=IZQUIERDA(B2; 3)" },
  { nombre: "DERECHA", sintaxis: "DERECHA(texto; [cantidad])", descripcion: "Toma los últimos caracteres de un texto.", ejemplo: "=DERECHA(B2; 2)" },
  { nombre: "LARGO", sintaxis: "LARGO(texto)", descripcion: "Cuenta los caracteres de un texto.", ejemplo: "=LARGO(B2)" },
  { nombre: "MAYUSC", sintaxis: "MAYUSC(texto)", descripcion: "Pasa un texto a mayúsculas.", ejemplo: "=MAYUSC(B2)" },
  { nombre: "MINUSC", sintaxis: "MINUSC(texto)", descripcion: "Pasa un texto a minúsculas.", ejemplo: "=MINUSC(B2)" },
  { nombre: "ESPACIOS", sintaxis: "ESPACIOS(texto)", descripcion: "Quita los espacios de más al inicio, al final y entre palabras.", ejemplo: "=ESPACIOS(B2)" },
  { nombre: "TEXTO", sintaxis: "TEXTO(valor; formato)", descripcion: "Muestra un número como texto con el formato indicado.", ejemplo: '=TEXTO(C2; "0.00")' },
  { nombre: "HOY", sintaxis: "HOY()", descripcion: "Devuelve la fecha de hoy.", ejemplo: "=HOY()" },
  { nombre: "AÑO", sintaxis: "AÑO(fecha)", descripcion: "Devuelve el año de una fecha.", ejemplo: "=AÑO(HOY())" },
  { nombre: "MES", sintaxis: "MES(fecha)", descripcion: "Devuelve el mes (1 a 12) de una fecha.", ejemplo: "=MES(HOY())" },
  { nombre: "DIA", sintaxis: "DIA(fecha)", descripcion: "Devuelve el día del mes de una fecha.", ejemplo: "=DIA(HOY())" },
  { nombre: "VERDADERO", sintaxis: "VERDADERO()", descripcion: "El valor lógico verdadero. Va con paréntesis.", ejemplo: "=VERDADERO()" },
  { nombre: "FALSO", sintaxis: "FALSO()", descripcion: "El valor lógico falso. Va con paréntesis, por ejemplo en BUSCARV.", ejemplo: "=FALSO()" },
];

const POR_NOMBRE = new Map(AYUDA_FUNCIONES.map((funcion) => [funcion.nombre, funcion]));
const NOMBRES_PLANILLA = HyperFormula.getRegisteredFunctionNames("esES");
const NOMBRE_EN_ESCRITURA = /[\p{L}][\p{L}\d.]*$/u;

function textoAbierto(entrada: string): boolean {
  return (entrada.match(/"/g) ?? []).length % 2 === 1;
}

export function funcionEnEscritura(entrada: string): AyudaFuncion | null {
  if (!entrada.startsWith("=")) return null;
  const pila: string[] = [];
  let enTexto = false;
  let nombre = "";
  for (const caracter of entrada.slice(1)) {
    if (caracter === '"') {
      enTexto = !enTexto;
      nombre = "";
    } else if (enTexto) {
      continue;
    } else if (caracter === "(") {
      pila.push(nombre.toUpperCase());
      nombre = "";
    } else if (caracter === ")") {
      pila.pop();
      nombre = "";
    } else {
      nombre = /[\p{L}\d.]/u.test(caracter) ? nombre + caracter : "";
    }
  }
  const actual = pila.at(-1);
  return actual ? (POR_NOMBRE.get(actual) ?? null) : null;
}

export function sugerenciasDeFuncion(entrada: string, limite = 6): AyudaFuncion[] {
  if (!entrada.startsWith("=") || textoAbierto(entrada)) return [];
  const prefijo = NOMBRE_EN_ESCRITURA.exec(entrada)?.[0]?.toUpperCase();
  if (!prefijo) return [];
  return AYUDA_FUNCIONES.filter((funcion) => funcion.nombre.startsWith(prefijo) && funcion.nombre !== prefijo).slice(0, limite);
}

export function aplicarSugerencia(entrada: string, nombre: string): string {
  return entrada.replace(NOMBRE_EN_ESCRITURA, `${nombre}(`);
}

type ErrorCelda = { value: string; type: string; message?: string };

function esErrorCelda(valor: unknown): valor is ErrorCelda {
  return typeof valor === "object" && valor !== null && "type" in valor && "value" in valor;
}

function explicacionDe(error: ErrorCelda): Pick<ErrorExplicado, "mensaje" | "sugerencia"> {
  const detalle = error.message ?? "";
  switch (error.type) {
    case "DIV_BY_ZERO":
      return { mensaje: "La fórmula divide por cero o por una celda vacía.", sugerencia: "Revisa la celda del divisor. Si puede valer 0, usa SI.ERROR(fórmula; 0)." };
    case "ERROR":
      return detalle.includes("RParen")
        ? { mensaje: "Falta cerrar un paréntesis en la fórmula.", sugerencia: "Cada «(» necesita su «)»." }
        : { mensaje: "La planilla no entiende la fórmula.", sugerencia: "Revisa que empiece con =, que los argumentos se separen con ; y que los textos vayan entre comillas." };
    case "NAME": {
      const funcion = /Function name (.+) not recognized/.exec(detalle)?.[1];
      if (funcion) {
        const parecida = sugerirNombre(funcion, POR_NOMBRE.keys()) ?? sugerirNombre(funcion, NOMBRES_PLANILLA);
        return {
          mensaje: `La planilla no conoce la función ${funcion}.`,
          sugerencia: parecida ? `¿Quisiste decir ${parecida}?` : "Revisa el nombre: las funciones van en español, como SUMA o PROMEDIO.",
        };
      }
      const nombre = /Named expression (.+) not recognized/.exec(detalle)?.[1] ?? "";
      if (nombre === "VERDADERO" || nombre === "FALSO") {
        return { mensaje: `La planilla no reconoce ${nombre} sin paréntesis.`, sugerencia: `Escribe ${nombre}() para el valor lógico.` };
      }
      return { mensaje: `La planilla no conoce «${nombre}».`, sugerencia: `Si es un texto, escríbelo entre comillas: "${nombre}".` };
    }
    case "VALUE":
      return detalle.includes("Cell range not allowed")
        ? { mensaje: "Aquí se espera una sola celda, no un rango.", sugerencia: "Usa el rango dentro de una función, como =SUMA(A1:B1)." }
        : { mensaje: "La fórmula opera con un texto como si fuera un número.", sugerencia: "Revisa que las celdas de la operación tengan números." };
    case "NA":
      return { mensaje: "No se encontró el valor buscado.", sugerencia: "Revisa que el valor exista en el rango de búsqueda y que la coincidencia sea exacta (FALSO() o 0)." };
    case "CYCLE":
      return { mensaje: "La fórmula se usa a sí misma (referencia circular).", sugerencia: "Una celda no puede depender de su propio resultado: revisa las referencias." };
    case "REF":
      return { mensaje: "La fórmula apunta a una celda que no existe.", sugerencia: "Revisa las referencias de la fórmula." };
    case "NUM":
      return { mensaje: "El resultado no es un número válido.", sugerencia: "Revisa que los argumentos estén dentro de lo que la función acepta." };
    default:
      return { mensaje: `La celda tiene el error ${error.value}.`, sugerencia: null };
  }
}

export function explicarErrorHoja(valor: unknown): ErrorExplicado | null {
  if (!esErrorCelda(valor)) return null;
  return { ...explicacionDe(valor), linea: null, original: valor.value };
}
