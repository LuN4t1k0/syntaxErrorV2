"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { OpcionesPython } from "@syntaxerror/engines/python";
import { crearClientePython, type ClientePython, type TrabajadorLike } from "@syntaxerror/engines/python-cliente";

type FaseCarga = "inactivo" | "cargando" | "listo" | "error";
type ContextoPython = { estado: FaseCarga; iniciar: () => void; cliente: () => ClientePython; opciones: OpcionesPython };

const Contexto = createContext<ContextoPython | null>(null);

function crearTrabajador(): TrabajadorLike {
  return new Worker(new URL("../../engines/python.worker.ts", import.meta.url), { type: "module" }) as unknown as TrabajadorLike;
}

// Un solo Python por pestaña: al pasar de una lección a otra sin recargar la página se reutiliza y solo cambian sus
// paquetes y archivos (cargarlo de nuevo tomaba unos 2,5 s por lección). Si se corta por un ciclo infinito, el cliente
// crea otro worker en la siguiente ejecución.
let compartido: ClientePython | null = null;

function clienteCompartido(opciones: OpcionesPython): ClientePython {
  compartido ??= crearClientePython(opciones, { crearTrabajador });
  return compartido;
}

export function PythonProvider({ opciones, children }: { opciones: OpcionesPython; children: ReactNode }) {
  const [estado, setEstado] = useState<FaseCarga>("inactivo");
  const cliente = useCallback(() => clienteCompartido(opciones), [opciones]);
  const iniciar = useCallback(() => {
    setEstado("cargando");
    cliente()
      .reconfigurar(opciones)
      .then(
        () => setEstado("listo"),
        () => setEstado("error")
      );
  }, [cliente, opciones]);
  const valor = useMemo(() => ({ estado, iniciar, cliente, opciones }), [estado, iniciar, cliente, opciones]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePython(): ContextoPython {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("usePython debe usarse dentro de PythonProvider");
  const { estado, iniciar } = contexto;
  useEffect(() => { if (estado === "inactivo") iniciar(); }, [estado, iniciar]);
  return contexto;
}

export function EstadoPython({ estado, onReintentar }: { estado: FaseCarga; onReintentar: () => void }) {
  if (estado === "listo") return <p className="text-sm font-bold text-accent">Python listo</p>;
  if (estado === "error") {
    return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"><span>No pudimos cargar Python. Revisa tu conexión; lo que escribiste se mantiene.</span><Button type="button" size="sm" variant="secondary" onClick={onReintentar}>Reintentar</Button></div>;
  }
  return <p className="text-sm text-muted-foreground">Cargando Python… la primera vez puede tardar unos segundos.</p>;
}
