"use client";

import { useEffect, useState } from "react";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import { mezclar } from "@/lib/mezclar";

type Opcion = { texto: string; correcta: boolean; porque: string };

export function Decision({ pregunta, opciones }: { pregunta: string; opciones: Opcion[] }) {
  const [orden, setOrden] = useState<number[] | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const cantidad = opciones.length;
  useEffect(() => setOrden(mezclar(Array.from({ length: cantidad }, (_, indice) => indice))), [cantidad]);
  return (
    <section className="card grid gap-4 p-5">
      <p className="font-mono text-sm font-bold text-primary">{"> decisión"}</p>
      <p className="font-bold leading-7">{pregunta}</p>
      {orden ? (
        <ul className="grid gap-2">
          {orden.map((indice) => {
            const opcion = opciones[indice];
            const esElegida = elegida === indice;
            return (
              <li key={indice} className="grid gap-1">
                <button type="button" aria-pressed={esElegida} disabled={elegida !== null} onClick={() => setElegida(indice)} className={cn("w-full rounded-md border p-3 text-left text-sm leading-6", esElegida && opcion.correcta && "border-primary bg-primary/10", esElegida && !opcion.correcta && "border-destructive bg-destructive/10", !esElegida && "border-border hover:border-primary")}>
                  {opcion.texto}
                </button>
                {elegida !== null ? <p className="px-3 text-sm text-muted-foreground">{opcion.correcta ? "Correcta. " : "Incorrecta. "}{opcion.porque}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted-foreground">Cargando opciones…</p>}
      {elegida !== null ? <div><Button type="button" variant="ghost" size="sm" onClick={() => setElegida(null)}>Elegir otra vez</Button></div> : null}
    </section>
  );
}
