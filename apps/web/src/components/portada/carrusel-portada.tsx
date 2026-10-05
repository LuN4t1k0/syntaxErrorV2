"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaquetaGit } from "./maqueta-git";
import { MaquetaIa } from "./maqueta-ia";
import { MaquetaSql } from "./maqueta-sql";

// El carrusel de la portada de la v1, con tres momentos de la ruta Data Analyst. El texto de la portada queda fijo;
// solo rota la maqueta. Se pausa con el mouse o el foco encima y no rota con "reducir movimiento".
const LAMINAS = [
  { id: "git", etiqueta: "Caso 0 · git y GitHub", descripcion: "Partes publicando tu primer repositorio: es tu portafolio desde el día uno.", Maqueta: MaquetaGit },
  { id: "sql", etiqueta: "SQL · Minimarkets del Sur", descripcion: "Respondes a gerencia con consultas que se validan al instante en tu navegador.", Maqueta: MaquetaSql },
  { id: "ia", etiqueta: "IA para datos", descripcion: "Usas la IA para avanzar más rápido, sin dejar de revisar lo que te entrega.", Maqueta: MaquetaIa },
] as const;

export const ROTACION_MS = 7000;

export function siguienteLamina(actual: number, total: number): number {
  return total <= 0 ? 0 : (actual + 1) % total;
}

export function CarruselPortada() {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndice((actual) => siguienteLamina(actual, LAMINAS.length)), ROTACION_MS);
    return () => window.clearInterval(id);
  }, [pausado, indice]);

  const lamina = LAMINAS[indice];
  return (
    <section
      aria-label="Así se aprende en syntaxError.cl"
      className="grid min-w-0 gap-4"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1" aria-live="polite">
          <p className="font-mono text-xs font-bold uppercase text-primary">{lamina.etiqueta}</p>
          <p className="text-sm text-muted-foreground">{lamina.descripcion}</p>
        </div>
        <div className="flex gap-2">
          {LAMINAS.map((opcion, posicion) => (
            <button
              key={opcion.id}
              type="button"
              aria-label={`Ver: ${opcion.etiqueta}`}
              aria-pressed={posicion === indice}
              onClick={() => setIndice(posicion)}
              className={`h-2.5 rounded-full transition-all ${posicion === indice ? "w-8 bg-primary" : "w-2.5 bg-border hover:bg-muted-foreground"}`}
            />
          ))}
        </div>
      </div>
      {/* La key reinicia la animación de escritura en cada lámina. */}
      <div key={lamina.id} className="motion-safe:animate-[aparecer_300ms_ease-out]">
        <lamina.Maqueta />
      </div>
      <Link href="/rutas/data-analyst" className="justify-self-start text-sm font-bold text-primary hover:underline">
        Ver la ruta Data Analyst →
      </Link>
    </section>
  );
}
