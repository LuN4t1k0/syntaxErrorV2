import type { EstadoMision } from "./servicio";

export type EstadoVisibleMision = "pendiente" | "en_curso" | "aprobada" | "bloqueada";

type Mision = { slug: string };
type Opciones = { sesion: boolean; ordenLibre: boolean; casoBloqueado: boolean };

export function estadosDeMisiones(
  misiones: Mision[],
  progreso: Record<string, EstadoMision | undefined>,
  opciones: Opciones
): { estados: EstadoVisibleMision[]; siguiente: number | null } {
  const estados: EstadoVisibleMision[] = [];
  let siguiente: number | null = null;
  let anteriorAprobada = true;

  for (const [indice, mision] of misiones.entries()) {
    const estado = progreso[mision.slug]?.estado;
    if (estado === "aprobada") {
      estados.push("aprobada");
      anteriorAprobada = true;
      continue;
    }

    const habilitada = !opciones.casoBloqueado && (opciones.ordenLibre || anteriorAprobada || !opciones.sesion);
    if (!habilitada) {
      estados.push("bloqueada");
      anteriorAprobada = false;
      continue;
    }

    estados.push(estado === "en_curso" ? "en_curso" : "pendiente");
    if (siguiente === null) siguiente = indice;
    anteriorAprobada = false;
  }

  return { estados, siguiente };
}
