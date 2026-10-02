"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OpcionesPython } from "@syntaxerror/engines/python";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { cargarProgreso, dependenciasNavegador, leerFallidos, reportarTarea, sumarFallido } from "@/lib/progreso/cliente";
import type { CasoCorto } from "@/lib/progreso/requisitos";
import { PythonProvider } from "./python-contexto";

export type MisionAnterior = { slug: string; titulo: string; tareas: string[] };
export type Bloqueo = { tipo: "mision"; mision: { slug: string; titulo: string } } | { tipo: "caso"; caso: CasoCorto; sesion: boolean };

type ContextoMision = {
  caso: string;
  mision: string;
  sinGuia: boolean;
  listo: boolean;
  bloqueo: Bloqueo | null;
  completa: boolean;
  fallidosMision: number;
  tareaAprobada: (id: string) => boolean;
  fallidosDe: (id: string) => number;
  registrarResultado: (id: string, resultado: Pick<ResultadoTarea, "aprobada" | "errorDeCodigo">) => void;
};

const Contexto = createContext<ContextoMision | null>(null);

export function MisionProvider({
  caso,
  mision,
  tareas,
  python,
  anterior,
  requisitos,
  sinGuia,
  children,
}: {
  caso: string;
  mision: string;
  tareas: string[];
  python: OpcionesPython | null;
  anterior: MisionAnterior | null;
  requisitos: CasoCorto[];
  sinGuia: boolean;
  children: ReactNode;
}) {
  const [aprobadas, setAprobadas] = useState<ReadonlySet<string>>(new Set());
  const [listo, setListo] = useState(false);
  const [bloqueo, setBloqueo] = useState<Bloqueo | null>(null);
  const [fallidosServidor, setFallidosServidor] = useState(0);
  const [fallidosSesion, setFallidosSesion] = useState(0);
  const [fallidosPorTarea, setFallidosPorTarea] = useState<Record<string, number>>({});
  const claveTareas = tareas.join("|");

  useEffect(() => {
    let vigente = true;
    const deps = dependenciasNavegador();
    setListo(false);
    setFallidosPorTarea(leerFallidos(deps.almacen, caso, mision));
    const tareasPorMision: Record<string, string[]> = { [mision]: claveTareas ? claveTareas.split("|") : [] };
    if (anterior) tareasPorMision[anterior.slug] = anterior.tareas;
    void cargarProgreso(caso, tareasPorMision, deps).then((progreso) => {
      if (!vigente) return;
      const propia = progreso.misiones[mision];
      if (propia && propia.tareasAprobadas.length > 0) setAprobadas((actuales) => new Set([...actuales, ...propia.tareasAprobadas]));
      setFallidosServidor(propia?.fallidos ?? 0);
      const casoPendiente = progreso.sesion ? progreso.bloqueadoPor : (requisitos[0] ?? null);
      if (casoPendiente) setBloqueo({ tipo: "caso", caso: casoPendiente, sesion: progreso.sesion });
      else if (anterior && progreso.misiones[anterior.slug]?.estado !== "aprobada") setBloqueo({ tipo: "mision", mision: { slug: anterior.slug, titulo: anterior.titulo } });
      else setBloqueo(null);
      setListo(true);
    });
    return () => {
      vigente = false;
    };
  }, [caso, mision, claveTareas, anterior, requisitos]);

  const registrarResultado = useCallback(
    (id: string, { aprobada, errorDeCodigo }: Pick<ResultadoTarea, "aprobada" | "errorDeCodigo">) => {
      // Un error de código ya se explica en la consola: no es un intento fallido y no se registra.
      if (errorDeCodigo) return;
      if (aprobada) {
        setAprobadas((actuales) => new Set(actuales).add(id));
      } else {
        setFallidosSesion((cantidad) => cantidad + 1);
        const total = sumarFallido(dependenciasNavegador().almacen, caso, mision, id);
        setFallidosPorTarea((actuales) => ({ ...actuales, [id]: total }));
      }
      void reportarTarea({ caso, mision, tarea: id, aprobada }, dependenciasNavegador());
    },
    [caso, mision]
  );

  const valor = useMemo<ContextoMision>(
    () => ({
      caso,
      mision,
      sinGuia,
      listo,
      bloqueo,
      completa: tareas.length > 0 && tareas.every((tarea) => aprobadas.has(tarea)),
      fallidosMision: fallidosServidor + fallidosSesion,
      tareaAprobada: (id) => aprobadas.has(id),
      fallidosDe: (id) => fallidosPorTarea[id] ?? 0,
      registrarResultado,
    }),
    [caso, mision, sinGuia, listo, bloqueo, tareas, aprobadas, fallidosServidor, fallidosSesion, fallidosPorTarea, registrarResultado]
  );

  return <Contexto.Provider value={valor}>{python ? <PythonProvider opciones={python}>{children}</PythonProvider> : children}</Contexto.Provider>;
}

export function useMision(): ContextoMision {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useMision debe usarse dentro de MisionProvider");
  return contexto;
}

export function useMisionOpcional(): ContextoMision | null {
  return useContext(Contexto);
}
