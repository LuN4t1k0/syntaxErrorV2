"use client";

import { Check, X } from "lucide-react";
import { Cursor, useEscritura, VentanaMaqueta } from "./ventana-maqueta";

// Clases de IA para datos: la IA resume las mismas ventas de Minimarkets y la persona revisa el resultado antes de
// enviarlo, que es la idea del curso: usar la IA sin perder el criterio.
const RESPUESTA = ["> Ventas de marzo: $2.984.600", "> Temuco lidera con el 43 %", "> Valdivia y Osorno suman el 57 %"];
const REVISION: [string, boolean][] = [
  ["¿Los números calzan con la tabla?", true],
  ["¿Dice de dónde salen los datos?", false],
];

export function MaquetaIa() {
  const visibles = useEscritura(RESPUESTA.length + REVISION.length, 700);
  return (
    <VentanaMaqueta archivo="asistente" lateral={{ titulo: "IA para datos", items: ["Calidad de datos", "SQL asistido por IA", "Explicar hallazgos", "Sesgos y errores en datos"], activo: 2 }}>
      <p className="font-mono text-xs font-bold uppercase text-primary">Explicar hallazgos</p>
      <p className="mt-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm">Resume estas ventas en 3 puntos para gerencia.</p>
      <div className="mt-3 grid gap-1 rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 sm:text-sm">
        {RESPUESTA.slice(0, visibles).map((linea) => (
          <span key={linea}>{linea}</span>
        ))}
        {visibles < RESPUESTA.length ? <Cursor listo={false} /> : null}
      </div>
      <p className="mt-4 text-xs font-black uppercase text-muted-foreground">Revisa antes de enviar</p>
      <ul className="mt-2 grid gap-1.5 text-sm">
        {REVISION.slice(0, Math.max(visibles - RESPUESTA.length, 0)).map(([pregunta, bien]) => (
          <li key={pregunta} className="flex items-start gap-2">
            {/* Íconos y no ✔ ✖: en los teléfonos esos caracteres salen como emoji y pierden el color. */}
            {bien ? <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} /> : <X className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={3} />}
            <span>
              {pregunta}
              {bien ? null : <span className="font-bold"> Pide la fuente.</span>}
            </span>
          </li>
        ))}
      </ul>
    </VentanaMaqueta>
  );
}
