export const TAMANO_PAGINA = 25;
const PAGINA_MAXIMA = 10_000;

export type Pagina<T> = { filas: T[]; total: number; pagina: number; paginas: number };

export function leerPagina(valor: string | string[] | undefined): number {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 1 && numero <= PAGINA_MAXIMA ? numero : 1;
}

export function desplazamiento(pagina: number): number {
  return (pagina - 1) * TAMANO_PAGINA;
}

export function armarPagina<T>(filas: T[], total: number, pagina: number): Pagina<T> {
  return { filas, total, pagina, paginas: Math.max(1, Math.ceil(total / TAMANO_PAGINA)) };
}
