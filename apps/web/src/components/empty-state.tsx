import Link from "next/link";

export function EmptyState({
  codigo,
  titulo,
  descripcion,
  href,
  accion,
}: {
  codigo: string;
  titulo: string;
  descripcion: string;
  href?: string;
  accion?: string;
}) {
  return (
    <section className="card empty-state" aria-label={titulo}>
      <span className="empty-state__symbol" aria-hidden="true">
        {">_"}
      </span>
      <p className="section-kicker">{codigo}</p>
      <h2 className="text-xl font-bold tracking-tight">{titulo}</h2>
      <p className="max-w-prose text-sm leading-6 text-muted-foreground">
        {descripcion}
      </p>
      {href && accion ? (
        <Link href={href} className="btn btn-secondary mt-2 w-fit">
          {accion}
        </Link>
      ) : null}
    </section>
  );
}
