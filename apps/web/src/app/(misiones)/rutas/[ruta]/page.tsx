import { notFound } from "next/navigation";
import { MapaRuta } from "@/components/rutas/mapa-ruta";
import { casosDeRuta, obtenerRuta, rutasParaPublicar } from "@/lib/contenido";
import type { PiezaRuta } from "@/lib/rutas/mapa";

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
  const piezas: PiezaRuta[] = (await casosDeRuta(ruta)).map((caso) => ({
    slug: caso.slug,
    titulo: caso.titulo,
    tipo: caso.tipo,
    empresa: caso.empresa,
    unidades: caso.misiones.length,
  }));
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`$ git log --graph --reverse ${ruta.slug}`}</p>
        <h1 className="text-3xl font-black">{ruta.titulo}</h1>
        <p className="text-sm font-bold text-muted-foreground">{ruta.cargo}</p>
        <p className="leading-7 text-muted-foreground">{ruta.descripcion}</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Cada clase es una rama: aprendes en ella y se fusiona en el caso que la aplica, en un trabajo real.
        </p>
      </header>
      <MapaRuta ruta={{ slug: ruta.slug, titulo: ruta.titulo }} piezas={piezas} />
    </main>
  );
}
