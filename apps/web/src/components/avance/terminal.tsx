import type { ReactNode } from "react";

// Una sección con el prompt de una terminal: $ comando, y el contenido en monoespaciado.
export function SeccionTerminal({ comando, etiqueta, children }: { comando: string; etiqueta?: string; children: ReactNode }) {
  return (
    <section className="card grid gap-3 p-5" aria-label={etiqueta ?? comando}>
      <p className="font-mono text-sm font-bold text-primary">{`$ ${comando}`}</p>
      <div className="grid gap-2 font-mono text-sm">{children}</div>
    </section>
  );
}
