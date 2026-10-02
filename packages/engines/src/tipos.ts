export type Fila = Record<string, unknown>;

// errorDeCodigo: el código no se pudo ejecutar (sintaxis, un nombre mal escrito, una fórmula con error). La consola lo
// explica al instante y no cuenta como intento fallido: para las pistas y el tutor solo cuentan los resultados incorrectos.
export type ResultadoTarea = { aprobada: boolean; diagnostico: string | null; errorDeCodigo?: true };
