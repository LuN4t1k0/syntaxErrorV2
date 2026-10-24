// Los días se cuentan en hora de Chile: una sesión a las 23:30 no debe caer en el día siguiente.
const ZONA = "America/Santiago";

const formato = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

// YYYY-MM-DD del día local.
export function diaLocal(fecha: Date): string {
  return formato.format(fecha);
}

function sumarDias(dia: string, cantidad: number): string {
  const [anio, mes, d] = dia.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, d + cantidad));
  return fecha.toISOString().slice(0, 10);
}

// La semana empieza el lunes.
export function inicioSemana(dia: string): string {
  const [anio, mes, d] = dia.split("-").map(Number);
  const semana = new Date(Date.UTC(anio, mes - 1, d)).getUTCDay();
  return sumarDias(dia, -((semana + 6) % 7));
}

// Días seguidos con actividad que terminan hoy. Si hoy todavía no practica, la racha de ayer sigue viva.
export function calcularRacha(dias: Iterable<string>, hoy: string): number {
  const activos = new Set(dias);
  let cursor = activos.has(hoy) ? hoy : sumarDias(hoy, -1);
  let racha = 0;
  while (activos.has(cursor)) {
    racha += 1;
    cursor = sumarDias(cursor, -1);
  }
  return racha;
}
