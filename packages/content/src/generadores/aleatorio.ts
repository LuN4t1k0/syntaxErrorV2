// Números pseudoaleatorios con semilla (mulberry32): la misma semilla produce siempre los mismos datos,
// así las soluciones de las tareas no cambian al volver a generar.
export type Aleatorio = {
  siguiente(): number;
  entero(minimo: number, maximo: number): number;
  elegir<T>(opciones: readonly T[]): T;
  elegirConPeso<T>(opciones: readonly (readonly [T, number])[]): T;
};

export function crearAleatorio(semilla: number): Aleatorio {
  let estado = semilla >>> 0;
  const siguiente = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    siguiente,
    entero: (minimo, maximo) => minimo + Math.floor(siguiente() * (maximo - minimo + 1)),
    elegir: (opciones) => opciones[Math.floor(siguiente() * opciones.length)],
    elegirConPeso: (opciones) => {
      const total = opciones.reduce((suma, [, peso]) => suma + peso, 0);
      let punto = siguiente() * total;
      for (const [opcion, peso] of opciones) {
        punto -= peso;
        if (punto < 0) return opcion;
      }
      return opciones[opciones.length - 1][0];
    },
  };
}
