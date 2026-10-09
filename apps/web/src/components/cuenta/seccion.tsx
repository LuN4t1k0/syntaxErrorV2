import type { ReactNode } from "react";

export function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  const id = `seccion-${titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section
      aria-labelledby={id}
      className="card account-section grid gap-5 p-5 sm:p-6"
    >
      <div className="grid gap-1">
        <h2 id={id} className="text-xl font-bold tracking-tight">
          {titulo}
        </h2>
        {descripcion ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {descripcion}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
