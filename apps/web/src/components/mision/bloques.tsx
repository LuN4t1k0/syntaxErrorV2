import type { ReactNode } from "react";

export function Brief({ de, children }: { de: string; children: ReactNode }) {
  return (
    <section className="card grid gap-2 border-l-4 border-l-primary p-5">
      <p className="font-mono text-xs font-bold uppercase text-muted-foreground">{`Mensaje de ${de}`}</p>
      <div className="grid gap-3 leading-7">{children}</div>
    </section>
  );
}

export function Concepto({ children }: { children: ReactNode }) {
  return (
    <section className="grid gap-3 leading-7">
      <p className="section-kicker">Concepto</p>
      {children}
    </section>
  );
}
