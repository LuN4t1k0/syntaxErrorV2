"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OpcionesPython } from "@syntaxerror/engines/python";
import { cargarProgreso, dependenciasNavegador, reportarTarea } from "@/lib/progreso/cliente";
import { PythonProvider } from "./python-contexto";

type ContextoMision = {
  completa: boolean;
  tareaAprobada: (id: string) => boolean;
  registrarResultado: (id: string, aprobada: boolean) => void;
};

const Contexto = createContext<ContextoMision | null>(null);

export function MisionProvider({
  caso,
  mision,
  tareas,
  python,
  children,
}: {
  caso: string;
  mision: string;
  tareas: string[];
  python: OpcionesPython | null;
  children: ReactNode;
}) {
  const [aprobadas, setAprobadas] = useState<ReadonlySet<string>>(new Set());
  const claveTareas = tareas.join("|");

  useEffect(() => {
    let vigente = true;
    void cargarProgreso(caso, { [mision]: claveTareas ? claveTareas.split("|") : [] }, dependenciasNavegador()).then((progreso) => {
      const previas = progreso.misiones[mision]?.tareasAprobadas ?? [];
      if (vigente && previas.length > 0) setAprobadas((actuales) => new Set([...actuales, ...previas]));
    });
    return () => {
      vigente = false;
    };
  }, [caso, mision, claveTareas]);

  const registrarResultado = useCallback(
    (id: string, aprobada: boolean) => {
      if (aprobada) setAprobadas((actuales) => new Set(actuales).add(id));
      void reportarTarea({ caso, mision, tarea: id, aprobada }, dependenciasNavegador());
    },
    [caso, mision]
  );

  const valor = useMemo<ContextoMision>(
    () => ({ completa: tareas.length > 0 && tareas.every((tarea) => aprobadas.has(tarea)), tareaAprobada: (id) => aprobadas.has(id), registrarResultado }),
    [aprobadas, tareas, registrarResultado]
  );

  return <Contexto.Provider value={valor}>{python ? <PythonProvider opciones={python}>{children}</PythonProvider> : children}</Contexto.Provider>;
}

export function useMision(): ContextoMision {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useMision debe usarse dentro de MisionProvider");
  return contexto;
}
