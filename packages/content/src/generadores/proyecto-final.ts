import Papa from "papaparse";
import { crearAleatorio } from "./aleatorio";

// Muestra de práctica del Caso 5, "Proyecto final": matrícula escolar por comuna y dependencia en la Región del
// Maule, de 2020 a 2024. Los números son inventados; el formato es el que suelen tener los datos abiertos en Chile,
// con sus trampas: separador punto y coma, miles con punto, «s/i» donde falta el dato y una fila de total regional
// al final de cada año, mezclada con el detalle. Lo que muestra: la matrícula municipal baja y Cauquenes es la
// comuna donde más cae.

export type FilaMatricula = { agno: number; region: string; comuna: string; dependencia: string; matricula: number; sinInformacion: boolean };

export const SEMILLA_PROYECTO_FINAL = 20250901;
export const AGNOS = [2020, 2021, 2022, 2023, 2024] as const;
export const AGNO_SIN_INFORMACION = 2022;
export const FILAS_SIN_INFORMACION = 3;
export const FILA_TOTAL = "Total regional";
export const COMUNA_CON_MAYOR_CAIDA = "Cauquenes";

const DEPENDENCIAS = ["Municipal", "Particular subvencionado", "Particular pagado"] as const;

// Matrícula de 2020 de cada comuna, en el orden de DEPENDENCIAS.
const BASE: Record<string, readonly [number, number, number]> = {
  Talca: [14800, 27600, 3900],
  Curicó: [12100, 22400, 2600],
  Linares: [9800, 13900, 1200],
  Constitución: [5200, 4100, 300],
  Cauquenes: [4900, 2700, 150],
  Molina: [4600, 4300, 200],
  Parral: [4300, 3100, 120],
  "San Javier": [4700, 3900, 180],
};

// Cambio anual de cada dependencia: la municipal baja, la particular subvencionada sube y la pagada casi no cambia.
const CAMBIO_ANUAL = [-0.025, 0.012, 0.004] as const;
const CAMBIO_MUNICIPAL_CAUQUENES = -0.075;

export function filasMatricula(): FilaMatricula[] {
  const aleatorio = crearAleatorio(SEMILLA_PROYECTO_FINAL);
  const filas: FilaMatricula[] = [];
  for (const [indice, agno] of AGNOS.entries()) {
    const detalle: FilaMatricula[] = [];
    for (const [comuna, base] of Object.entries(BASE)) {
      for (const [posicion, dependencia] of DEPENDENCIAS.entries()) {
        const cambio = comuna === COMUNA_CON_MAYOR_CAIDA && posicion === 0 ? CAMBIO_MUNICIPAL_CAUQUENES : CAMBIO_ANUAL[posicion];
        const ruido = 1 + aleatorio.entero(-10, 10) / 1000;
        const matricula = Math.round(base[posicion] * (1 + cambio) ** indice * ruido);
        detalle.push({ agno, region: "Maule", comuna, dependencia, matricula, sinInformacion: false });
      }
    }
    // En un año, algunos establecimientos no informaron: el archivo dice «s/i», pero el total regional los incluye.
    if (agno === AGNO_SIN_INFORMACION) {
      let marcadas = 0;
      while (marcadas < FILAS_SIN_INFORMACION) {
        const fila = aleatorio.elegir(detalle);
        if (fila.sinInformacion) continue;
        fila.sinInformacion = true;
        marcadas += 1;
      }
    }
    const total = detalle.reduce((suma, fila) => suma + fila.matricula, 0);
    filas.push(...detalle, { agno, region: "Maule", comuna: FILA_TOTAL, dependencia: "Todas", matricula: total, sinInformacion: false });
  }
  return filas;
}

// 12345 → "12.345", como se escriben los miles en Chile.
export function conMiles(numero: number): string {
  return String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function generarProyectoFinal(): { matricula_comunal: string } {
  const filas = filasMatricula().map(({ sinInformacion, matricula, ...fila }) => ({ ...fila, matricula: sinInformacion ? "s/i" : conMiles(matricula) }));
  return { matricula_comunal: `${Papa.unparse(filas, { delimiter: ";", newline: "\n" })}\n` };
}
