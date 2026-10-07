import type { IntentoTarea } from "./esquemas";
import type { CasoCorto } from "./requisitos";
import type { EstadoMision, RevisionEntregable } from "./servicio";

export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type Dependencias = { fetch: typeof fetch; almacen: Almacen | null };
export type CertificadoVisible = { codigo: string; tipo: "caso" | "ruta"; titulo: string };
export type ProgresoVisible = {
  sesion: boolean;
  misiones: Record<string, EstadoMision>;
  entregable: string | null;
  revision: RevisionEntregable | null;
  completo: boolean;
  certificados: CertificadoVisible[];
  bloqueadoPor: CasoCorto | null;
  // Sin bloqueos de orden para esta persona (probador, o todos si un admin lo encendió).
  ordenLibre: boolean;
  // El caso es de una ruta en beta y la persona no es probadora (la API respondió 403 solo_probadores).
  soloProbadores: boolean;
};

type Pendiente = Omit<IntentoTarea, "aprobada">;
const CLAVE = "syntaxerror:progreso-pendiente";
const LOTE = 200;
const JSON_HEADERS = { "Content-Type": "application/json" };
const claveDe = (pendiente: Pendiente) => `${pendiente.caso}/${pendiente.mision}/${pendiente.tarea}`;

export function leerPendientes(almacen: Almacen | null): Pendiente[] {
  if (!almacen) return [];
  try {
    const guardado = almacen.getItem(CLAVE);
    const valor: unknown = guardado ? JSON.parse(guardado) : [];
    return Array.isArray(valor) ? (valor as Pendiente[]) : [];
  } catch {
    return [];
  }
}

function escribirPendientes(almacen: Almacen | null, pendientes: Pendiente[]): void {
  if (!almacen) return;
  try {
    if (pendientes.length > 0) almacen.setItem(CLAVE, JSON.stringify(pendientes));
    else almacen.removeItem(CLAVE);
  } catch {}
}

function guardarPendiente(almacen: Almacen | null, intento: IntentoTarea): void {
  const pendientes = leerPendientes(almacen);
  const nuevo = { caso: intento.caso, mision: intento.mision, tarea: intento.tarea };
  if (pendientes.some((pendiente) => claveDe(pendiente) === claveDe(nuevo))) return;
  escribirPendientes(almacen, [...pendientes, nuevo]);
}

export async function reportarTarea(intento: IntentoTarea, deps: Dependencias): Promise<"servidor" | "local" | "descartado"> {
  try {
    const respuesta = await deps.fetch("/api/progreso", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(intento) });
    if (respuesta.ok) return "servidor";
    if (respuesta.status !== 401 && respuesta.status < 500) return "descartado";
  } catch {}
  if (!intento.aprobada) return "descartado";
  guardarPendiente(deps.almacen, intento);
  return "local";
}

export async function sincronizarPendientes(deps: Dependencias): Promise<number> {
  const lote = leerPendientes(deps.almacen).slice(0, LOTE);
  if (lote.length === 0) return 0;
  try {
    const respuesta = await deps.fetch("/api/progreso/sync", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ intentos: lote.map((pendiente) => ({ ...pendiente, aprobada: true })) }) });
    if (!respuesta.ok) return 0;
    const { aplicados } = (await respuesta.json()) as { aplicados: number };
    const enviados = new Set(lote.map(claveDe));
    escribirPendientes(deps.almacen, leerPendientes(deps.almacen).filter((pendiente) => !enviados.has(claveDe(pendiente))));
    return aplicados;
  } catch {
    return 0;
  }
}

export async function cargarProgreso(caso: string, tareasPorMision: Record<string, string[]>, deps: Dependencias): Promise<ProgresoVisible> {
  let servidor: Omit<ProgresoVisible, "sesion" | "soloProbadores"> | null = null;
  let soloProbadores = false;
  try {
    const respuesta = await deps.fetch(`/api/progreso?caso=${encodeURIComponent(caso)}`, { cache: "no-store" });
    if (respuesta.ok) servidor = (await respuesta.json()) as Omit<ProgresoVisible, "sesion" | "soloProbadores">;
    else if (respuesta.status === 403) {
      const error = ((await respuesta.json().catch(() => ({}))) as { error?: string }).error;
      soloProbadores = error === "solo_probadores" || error === "ruta_no_disponible";
    }
  } catch {
    servidor = null;
  }
  const locales = leerPendientes(deps.almacen).filter((pendiente) => pendiente.caso === caso);
  const misiones: Record<string, EstadoMision> = {};
  for (const [mision, tareas] of Object.entries(tareasPorMision)) {
    const delServidor = servidor?.misiones[mision];
    const aprobadas = new Set([...(delServidor?.tareasAprobadas ?? []), ...locales.filter((pendiente) => pendiente.mision === mision).map((pendiente) => pendiente.tarea)]);
    if (!delServidor && aprobadas.size === 0) continue;
    misiones[mision] = {
      estado: tareas.length > 0 && tareas.every((tarea) => aprobadas.has(tarea)) ? "aprobada" : "en_curso",
      tareasAprobadas: [...aprobadas],
      fallidos: delServidor?.fallidos ?? 0,
    };
  }
  return {
    sesion: servidor !== null || soloProbadores,
    misiones,
    entregable: servidor?.entregable ?? null,
    revision: servidor?.revision ?? null,
    completo: servidor?.completo ?? false,
    certificados: servidor?.certificados ?? [],
    bloqueadoPor: servidor?.bloqueadoPor ?? null,
    ordenLibre: servidor?.ordenLibre ?? false,
    soloProbadores,
  };
}

// Intentos fallidos por tarea, para liberar las pistas. Es un empujón pedagógico, no seguridad:
// las pistas ya vienen en la página. Sin almacenamiento disponible, se cuenta en memoria.
const CLAVE_FALLIDOS = "syntaxerror:fallidos";
const fallidosEnMemoria: Record<string, number> = {};

function leerMapaFallidos(almacen: Almacen | null): Record<string, number> {
  if (!almacen) return fallidosEnMemoria;
  try {
    const valor: unknown = JSON.parse(almacen.getItem(CLAVE_FALLIDOS) ?? "{}");
    return valor && typeof valor === "object" ? (valor as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function leerFallidos(almacen: Almacen | null, caso: string, mision: string): Record<string, number> {
  const prefijo = `${caso}/${mision}/`;
  return Object.fromEntries(
    Object.entries(leerMapaFallidos(almacen))
      .filter(([clave]) => clave.startsWith(prefijo))
      .map(([clave, cantidad]) => [clave.slice(prefijo.length), cantidad])
  );
}

export function sumarFallido(almacen: Almacen | null, caso: string, mision: string, tarea: string): number {
  const mapa = leerMapaFallidos(almacen);
  const clave = `${caso}/${mision}/${tarea}`;
  mapa[clave] = (mapa[clave] ?? 0) + 1;
  if (almacen) {
    try {
      almacen.setItem(CLAVE_FALLIDOS, JSON.stringify(mapa));
    } catch {}
  }
  return mapa[clave];
}

export function dependenciasNavegador(): Dependencias {
  let almacen: Almacen | null = null;
  try {
    almacen = window.localStorage;
  } catch {
    almacen = null;
  }
  return { fetch: window.fetch.bind(window), almacen };
}
