import Papa from "papaparse";
import { crearAleatorio } from "./aleatorio";

// Datos del Caso 1, "Despachos Rápidos": una pyme de despachos de la Región Metropolitana y regiones, marzo de 2025.
// Son inventados, pero con los defectos de una planilla real, que el caso enseña a encontrar y limpiar (misión 5).

export type FilaDato = Record<string, string | number | null>;
export type DatosDespachos = { comunas: FilaDato[]; despachos: FilaDato[]; despachos_limpios: FilaDato[] };

export const SEMILLA = 20250301;
export const CANTIDAD_DESPACHOS = 60;
const PRIMER_ID = 1001;
const COSTO_POR_KILO = 120;

export const COMUNAS: FilaDato[] = [
  { comuna: "Santiago", region: "Metropolitana", zona: "Centro", tarifa: 2900, dias_compromiso: 1 },
  { comuna: "Providencia", region: "Metropolitana", zona: "Oriente", tarifa: 3100, dias_compromiso: 1 },
  { comuna: "Ñuñoa", region: "Metropolitana", zona: "Oriente", tarifa: 3100, dias_compromiso: 1 },
  { comuna: "Las Condes", region: "Metropolitana", zona: "Oriente", tarifa: 3400, dias_compromiso: 2 },
  { comuna: "La Florida", region: "Metropolitana", zona: "Sur", tarifa: 3300, dias_compromiso: 2 },
  { comuna: "Puente Alto", region: "Metropolitana", zona: "Sur", tarifa: 3800, dias_compromiso: 2 },
  { comuna: "Maipú", region: "Metropolitana", zona: "Poniente", tarifa: 3500, dias_compromiso: 2 },
  { comuna: "Pudahuel", region: "Metropolitana", zona: "Poniente", tarifa: 3600, dias_compromiso: 2 },
  { comuna: "Quilicura", region: "Metropolitana", zona: "Norte", tarifa: 3700, dias_compromiso: 2 },
  { comuna: "San Bernardo", region: "Metropolitana", zona: "Sur", tarifa: 3900, dias_compromiso: 2 },
  { comuna: "Rancagua", region: "O'Higgins", zona: "Regiones", tarifa: 5900, dias_compromiso: 3 },
  { comuna: "Valparaíso", region: "Valparaíso", zona: "Regiones", tarifa: 6200, dias_compromiso: 3 },
];

// Más pedidos donde vive más gente: así los resúmenes por comuna no salen parejos.
const PESO_COMUNA: Record<string, number> = { Maipú: 9, "Puente Alto": 8, Santiago: 7, "La Florida": 6, Ñuñoa: 5, Providencia: 4 };

// Los defectos, en posiciones fijas (índice de despacho, desde 0) para que las tareas puedan apuntar a ellos.
export const DEFECTOS = {
  comunaMalEscrita: { 4: (comuna: string) => `  ${comuna}`, 17: (comuna: string) => comuna.toLowerCase(), 29: (comuna: string) => `${comuna}  `, 41: (comuna: string) => comuna.toUpperCase() } as Record<number, (comuna: string) => string>,
  fechaComoTexto: [9, 33, 52],
  costoVacio: [12, 47],
  duplicados: [21, 38],
};

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");
const fechaChilena = (fecha: Date) => `${dosDigitos(fecha.getUTCDate())}/${dosDigitos(fecha.getUTCMonth() + 1)}/${fecha.getUTCFullYear()}`;
const fechaIso = (fecha: Date) => `${fecha.getUTCFullYear()}-${dosDigitos(fecha.getUTCMonth() + 1)}-${dosDigitos(fecha.getUTCDate())}`;
const sumarDias = (fecha: Date, dias: number) => new Date(fecha.getTime() + dias * 86_400_000);

export function generarDespachosRapidos(): DatosDespachos {
  const aleatorio = crearAleatorio(SEMILLA);
  const pesos = COMUNAS.map((fila) => [fila, PESO_COMUNA[String(fila.comuna)] ?? 2] as const);
  const limpios: FilaDato[] = [];
  const entregas: Date[] = [];
  for (let indice = 0; indice < CANTIDAD_DESPACHOS; indice += 1) {
    const comuna = aleatorio.elegirConPeso(pesos);
    const pedido = new Date(Date.UTC(2025, 2, aleatorio.entero(1, 27)));
    const compromiso = Number(comuna.dias_compromiso);
    const demora = Math.max(1, compromiso + aleatorio.elegirConPeso([[-1, 2], [0, 6], [1, 2], [2, 1]] as const));
    const devuelto = aleatorio.siguiente() < 0.12 && !DEFECTOS.fechaComoTexto.includes(indice) && !DEFECTOS.duplicados.includes(indice);
    const peso = aleatorio.entero(1, 20);
    const entrega = sumarDias(pedido, demora);
    entregas.push(entrega);
    limpios.push({
      id: PRIMER_ID + indice,
      fecha_pedido: fechaChilena(pedido),
      fecha_entrega: devuelto ? null : fechaChilena(entrega),
      comuna: comuna.comuna,
      cliente: aleatorio.elegirConPeso([["persona", 3], ["empresa", 2]] as const),
      peso_kg: peso,
      costo: Number(comuna.tarifa) + peso * COSTO_POR_KILO,
      estado: devuelto ? "devuelto" : "entregado",
    });
  }

  const despachos = limpios.map((fila, indice) => {
    const sucia = { ...fila };
    const malEscrita = DEFECTOS.comunaMalEscrita[indice];
    if (malEscrita) sucia.comuna = malEscrita(String(fila.comuna));
    if (DEFECTOS.fechaComoTexto.includes(indice)) sucia.fecha_entrega = fechaIso(entregas[indice]);
    if (DEFECTOS.costoVacio.includes(indice)) sucia.costo = null;
    return sucia;
  });
  for (const indice of DEFECTOS.duplicados) despachos.push({ ...despachos[indice] });

  return { comunas: COMUNAS, despachos, despachos_limpios: limpios };
}

export function aCsv(filas: FilaDato[]): string {
  return `${Papa.unparse(filas, { newline: "\n" })}\n`;
}
