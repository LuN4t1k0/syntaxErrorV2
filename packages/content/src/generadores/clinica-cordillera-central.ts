import { crearAleatorio } from "./aleatorio";
import type { FilaDato } from "./despachos-rapidos";

// Datos del Caso 4, "Clínica Cordillera Central": un centro de salud privado con cuatro sedes, consultas
// ambulatorias y urgencias, de enero a junio de 2025. Son inventados y no tienen ningún dato de pacientes.
// Lo que el dashboard tiene que mostrar: en invierno (mayo y junio) suben las urgencias y la espera, sobre todo
// en Maipú, y Dermatología tiene muchas más inasistencias que el resto de las especialidades.

export type DatosClinica = { sedes: FilaDato[]; especialidades: FilaDato[]; atenciones: FilaDato[] };

export const SEMILLA_CLINICA = 20250601;
export const CANTIDAD_ATENCIONES = 1200;
export const SEDE_SATURADA = 2;
export const ESPECIALIDAD_CON_INASISTENCIAS = 4;
const URGENCIA = 8;

export const SEDES: FilaDato[] = [
  { id: 1, nombre: "Sede Ñuñoa", comuna: "Ñuñoa" },
  { id: 2, nombre: "Sede Maipú", comuna: "Maipú" },
  { id: 3, nombre: "Sede La Florida", comuna: "La Florida" },
  { id: 4, nombre: "Sede Providencia", comuna: "Providencia" },
];

export const ESPECIALIDADES: FilaDato[] = [
  { id: 1, nombre: "Medicina general", area: "ambulatoria" },
  { id: 2, nombre: "Pediatría", area: "ambulatoria" },
  { id: 3, nombre: "Traumatología", area: "ambulatoria" },
  { id: 4, nombre: "Dermatología", area: "ambulatoria" },
  { id: 5, nombre: "Ginecología", area: "ambulatoria" },
  { id: 6, nombre: "Cardiología", area: "ambulatoria" },
  { id: 7, nombre: "Oftalmología", area: "ambulatoria" },
  { id: URGENCIA, nombre: "Urgencia", area: "urgencia" },
];

// Más atenciones en invierno, por los virus respiratorios.
const MESES = [[1, 1], [2, 0.9], [3, 1], [4, 1.1], [5, 1.4], [6, 1.6]] as const;
const DIAS: Record<number, number> = { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30 };
const PESO_SEDE = [[1, 3], [2, 4], [3, 3], [4, 2]] as const;
const PESO_ESPECIALIDAD = [[1, 6], [2, 4], [3, 3], [4, 2], [5, 3], [6, 2], [7, 2]] as const;
// Espera base en la sala de urgencia, en minutos, y cuánto sube en invierno.
const ESPERA_BASE: Record<number, number> = { 1: 40, 2: 60, 3: 50, 4: 35 };
const ALZA_INVIERNO: Record<number, number> = { 5: 20, 6: 35 };

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");

export function generarClinicaCordilleraCentral(): DatosClinica {
  const aleatorio = crearAleatorio(SEMILLA_CLINICA);
  const atenciones: FilaDato[] = [];
  for (let indice = 0; indice < CANTIDAD_ATENCIONES; indice += 1) {
    const mes = aleatorio.elegirConPeso(MESES);
    const sede = aleatorio.elegirConPeso(PESO_SEDE);
    const invierno = mes >= 5;
    const esUrgencia = aleatorio.siguiente() < (invierno ? 0.5 : 0.33);
    const prevision = aleatorio.elegirConPeso([["Fonasa", 6], ["Isapre", 3], ["Particular", 1]] as const);
    const fecha = `2025-${dosDigitos(mes)}-${dosDigitos(aleatorio.entero(1, DIAS[mes]))}`;
    if (esUrgencia) {
      // En Maipú la sala de urgencia se satura en invierno: el alza le pega el doble.
      const alza = (ALZA_INVIERNO[mes] ?? 0) * (sede === SEDE_SATURADA ? 2 : 1);
      const espera = Math.max(5, ESPERA_BASE[sede] + alza + aleatorio.entero(-15, 15));
      const abandono = espera > 100 && aleatorio.siguiente() < 0.3;
      atenciones.push({ fecha, sede_id: sede, especialidad_id: URGENCIA, tipo: "urgencia", estado: abandono ? "abandono" : "atendida", espera_minutos: espera, prevision });
    } else {
      const especialidad = aleatorio.elegirConPeso(PESO_ESPECIALIDAD);
      const azar = aleatorio.siguiente();
      const inasistencia = especialidad === ESPECIALIDAD_CON_INASISTENCIAS ? 0.26 : 0.09;
      const estado = azar < inasistencia ? "inasistencia" : azar < inasistencia + 0.04 ? "cancelada" : "atendida";
      atenciones.push({ fecha, sede_id: sede, especialidad_id: especialidad, tipo: "consulta", estado, espera_minutos: null, prevision });
    }
  }
  atenciones.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  return { sedes: SEDES, especialidades: ESPECIALIDADES, atenciones: atenciones.map((atencion, indice) => ({ id: indice + 1, ...atencion })) };
}
