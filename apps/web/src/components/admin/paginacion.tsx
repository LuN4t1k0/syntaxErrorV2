import Link from "next/link";

// `parametro` permite dos listas paginadas en la misma página (por ejemplo, solicitudes y comentarios).
export function Paginacion({
  ruta,
  parametros,
  pagina,
  paginas,
  parametro = "pagina",
  etiqueta = "Paginación",
}: {
  ruta: string;
  parametros: Record<string, string>;
  pagina: number;
  paginas: number;
  parametro?: string;
  etiqueta?: string;
}) {
  if (paginas <= 1) return null;
  const enlace = (numero: number) => `${ruta}?${new URLSearchParams({ ...parametros, [parametro]: String(numero) }).toString()}`;
  return (
    <nav aria-label={etiqueta} className="flex items-center gap-4 text-sm font-bold">
      {pagina > 1 ? <Link className="text-accent hover:underline" href={enlace(pagina - 1)}>← Anterior</Link> : <span />}
      <span className="text-muted-foreground">{`Página ${Math.min(pagina, paginas)} de ${paginas}`}</span>
      {pagina < paginas ? <Link className="text-accent hover:underline" href={enlace(pagina + 1)}>Siguiente →</Link> : null}
    </nav>
  );
}
