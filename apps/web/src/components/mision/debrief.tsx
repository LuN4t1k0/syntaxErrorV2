"use client";

import type { ReactNode } from "react";
import { useMision } from "./mision-provider";

// El cierre aparece al aprobar. En una lección explica la solución; en una misión suma cómo contarlo en una entrevista.
export function Debrief({ entrevista, unidad = { nombre: "misión", Nombre: "Misión" }, children }: { entrevista?: string; unidad?: { nombre: string; Nombre: string }; children: ReactNode }) {
  const { completa } = useMision();
  if (!completa) return <section className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">{`Aprueba las tareas de esta ${unidad.nombre} para ver el cierre.`}</section>;
  return (
    <section className="card grid gap-3 border-l-4 border-l-primary p-5">
      <h2 className="text-xl font-black">{`${unidad.Nombre} aprobada`}</h2>
      <div className="grid gap-3 leading-7">{children}</div>
      {entrevista ? (
        <div className="rounded-md bg-surface-raised p-4 text-sm leading-6">
          <p className="font-bold">En una entrevista</p>
          <p>{entrevista}</p>
        </div>
      ) : null}
    </section>
  );
}
