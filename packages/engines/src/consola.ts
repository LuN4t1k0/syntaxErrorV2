/**
 * Contrato común de las consolas de trabajo (propuesta pedagógica, secciones 10 y 13).
 *
 * Toda consola (SQL, planilla, Python y las que traigan las rutas futuras) hace cuatro cosas:
 * ejecutar, validar, mostrar el resultado y explicar el error.
 * - Ejecutar devuelve `{ ok: true, ... }` con su resultado (y `avisos` si los hay) o `{ ok: false, error }`.
 * - Validar devuelve `ResultadoTarea` (./tipos).
 * - Un error se explica con `ErrorExplicado`: en español, con sugerencia y línea, sin perder el original.
 * - Un aviso marca algo que se ejecutó pero probablemente está mal; nunca bloquea.
 *
 * Regla pedagógica: una explicación explica el error, nunca entrega la solución de la tarea.
 */
export type ErrorExplicado = { mensaje: string; sugerencia: string | null; linea: number | null; original: string };
export type Aviso = { mensaje: string; linea: number | null };

export function errorSimple(mensaje: string, original = ""): ErrorExplicado {
  return { mensaje, sugerencia: null, linea: null, original };
}

export function textoDeError(error: ErrorExplicado): string {
  const partes = [error.linea ? `Línea ${error.linea}: ${error.mensaje}` : error.mensaje];
  if (error.sugerencia) partes.push(error.sugerencia);
  return partes.join(" ");
}

export function distancia(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  let previa = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i += 1) {
    const actual = [i];
    for (let j = 1; j <= y.length; j += 1) {
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    previa = actual;
  }
  return previa[y.length];
}

// Un tercio del largo (mínimo 1): "venta" acepta 1 diferencia y "datos/venta.csv" hasta 5.
export function sugerirNombre(nombre: string, candidatos: Iterable<string>): string | null {
  if (!nombre) return null;
  const limite = Math.max(1, Math.floor(nombre.length / 3));
  let mejor: string | null = null;
  let menor = Number.POSITIVE_INFINITY;
  for (const candidato of candidatos) {
    if (candidato === nombre) continue;
    const valor = distancia(nombre, candidato);
    if (valor < menor) {
      mejor = candidato;
      menor = valor;
    }
  }
  return mejor !== null && menor <= limite ? mejor : null;
}
