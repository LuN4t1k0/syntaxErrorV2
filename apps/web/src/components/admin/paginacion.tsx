import Link from "next/link";

export function Paginacion({ ruta, parametros, pagina, paginas }: { ruta: string; parametros: Record<string, string>; pagina: number; paginas: number }) {
  if (paginas <= 1) return null;
  const enlace = (numero: number) => `${ruta}?${new URLSearchParams({ ...parametros, pagina: String(numero) }).toString()}`;
  return (
    <nav aria-label="Paginación" className="flex items-center gap-4 text-sm font-bold">
      {pagina > 1 ? <Link className="text-primary hover:underline" href={enlace(pagina - 1)}>← Anterior</Link> : <span />}
      <span className="text-muted-foreground">{`Página ${Math.min(pagina, paginas)} de ${paginas}`}</span>
      {pagina < paginas ? <Link className="text-primary hover:underline" href={enlace(pagina + 1)}>Siguiente →</Link> : null}
    </nav>
  );
}
