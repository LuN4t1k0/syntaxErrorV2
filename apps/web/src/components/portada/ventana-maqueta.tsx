"use client";

import { useEffect, useState } from "react";

// Muestra `total` piezas de a una, como si se escribieran. Con "reducir movimiento", todo aparece de inmediato.
export function useEscritura(total: number, intervaloMs: number): number {
  const [visibles, setVisibles] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibles(total);
      return;
    }
    const id = window.setInterval(() => {
      setVisibles((actual) => {
        if (actual >= total) window.clearInterval(id);
        return Math.min(actual + 1, total);
      });
    }, intervaloMs);
    return () => window.clearInterval(id);
  }, [total, intervaloMs]);
  return visibles;
}

// La ventana de las maquetas de la portada: una barra con tres puntos y el nombre del archivo, y una columna lateral
// que solo se ve desde pantallas medianas. Son dibujos: nada se ejecuta.
export function VentanaMaqueta({
  archivo,
  lateral,
  children,
}: {
  archivo: string;
  lateral: { titulo: string; items: string[]; activo: number };
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-2xl" aria-hidden="true">
      <div className="flex h-11 items-center gap-2 border-b border-border px-4">
        <span className="size-2.5 rounded-full bg-destructive" />
        <span className="size-2.5 rounded-full bg-warning" />
        <span className="size-2.5 rounded-full bg-success" />
        <span className="ml-3 font-mono text-xs text-muted-foreground">{archivo}</span>
      </div>
      <div className="grid min-h-[24rem] md:grid-cols-[11rem_1fr]">
        <div className="hidden border-r border-border bg-background p-4 md:block">
          <p className="text-xs font-black uppercase text-muted-foreground">{lateral.titulo}</p>
          {lateral.items.map((item, indice) => (
            <p
              key={item}
              className={`mt-2 rounded-md px-2 py-2 text-xs font-bold ${indice === lateral.activo ? "bg-primary/15 text-primary" : indice < lateral.activo ? "text-foreground" : "text-muted-foreground"}`}
            >
              {indice < lateral.activo ? "✔ " : indice === lateral.activo ? "▸ " : "· "}
              {item}
            </p>
          ))}
        </div>
        <div className="min-w-0 p-5">{children}</div>
      </div>
    </div>
  );
}

export function Cursor({ listo }: { listo: boolean }) {
  return <span className={`text-primary ${listo ? "motion-safe:animate-pulse" : ""}`}>_</span>;
}
