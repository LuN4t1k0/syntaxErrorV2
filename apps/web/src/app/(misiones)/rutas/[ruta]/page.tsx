import Link from "next/link";
import { notFound } from "next/navigation";
import { casosDeRuta, obtenerRuta, rutasParaPublicar } from "@/lib/contenido";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ ruta: string }> };

export async function generateStaticParams() {
  return (await rutasParaPublicar()).map((ruta) => ({ ruta: ruta.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const ruta = await obtenerRuta((await params).ruta);
  return { title: ruta?.titulo ?? "Ruta" };
}

export default async function RutaPage({ params }: Parametros) {
  const ruta = await obtenerRuta((await params).ruta);
  if (!ruta) notFound();
  const casos = await casosDeRuta(ruta);
  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`> ruta: ${ruta.cargo}`}</p>
        <h1 className="text-3xl font-black">{ruta.titulo}</h1>
        <p className="leading-7 text-muted-foreground">{ruta.descripcion}</p>
      </header>
      <ol className="grid gap-3">
        {casos.map((caso, indice) => {
          // Las clases van antes del caso que las aplica y no cuentan en la numeración de los casos.
          const esClases = caso.tipo === "clases";
          const numero = casos.slice(0, indice + 1).filter((anterior) => anterior.tipo === "caso").length;
          return (
            <li key={caso.slug}>
              <Link href={`/casos/${caso.slug}`} className="card grid gap-1 p-5 hover:border-primary">
                <span className="font-mono text-xs text-muted-foreground">{esClases ? "Clases" : `Caso ${numero} · ${caso.empresa}`}</span>
                <span className="text-lg font-black">{caso.titulo}</span>
                <span className="text-sm text-muted-foreground">{`${caso.misiones.length} ${esClases ? "lecciones" : "misiones"}`}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
