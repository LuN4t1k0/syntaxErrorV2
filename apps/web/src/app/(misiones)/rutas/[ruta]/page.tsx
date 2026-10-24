import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { MapaRuta } from "@/components/rutas/mapa-ruta";
import { casosDeRuta, incluirBorradores, obtenerRuta, rutasParaConstruir } from "@/lib/contenido";
import { accesoBeta } from "@/lib/beta";
import { listarRutasConEstado, mapaVisible } from "@/lib/rutas/estado";
import { obtenerUsuarioId } from "@/lib/sesion";
import type { PiezaRuta } from "@/lib/rutas/mapa";
import "@/components/panel/panel.css";
import "@/components/rutas/mapa.css";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
type Parametros = { params: Promise<{ ruta: string }> };

export async function generateStaticParams() {
  return (await rutasParaConstruir()).map((ruta) => ({ ruta: ruta.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const ruta = await obtenerRuta((await params).ruta);
  // Una ruta en beta no se indexa hasta que se publique.
  return { title: ruta?.titulo ?? "Ruta", ...(ruta?.estado === "beta" ? { robots: { index: false, follow: false } } : {}) };
}

export default async function RutaPage({ params }: Parametros) {
  const slug = (await params).ruta;
  const [ruta, estado] = await Promise.all([obtenerRuta(slug), listarRutasConEstado().then((rutas) => rutas.find((candidata) => candidata.slug === slug))]);
  if (!ruta || !estado) notFound();
  const userId = await obtenerUsuarioId();
  const puedeBeta = userId ? await accesoBeta(getDb(), userId) : false;
  if (!mapaVisible(estado.estadoVigente, puedeBeta, incluirBorradores())) notFound();
  const piezas: PiezaRuta[] = (await casosDeRuta(ruta)).map((caso) => ({
    slug: caso.slug,
    titulo: caso.titulo,
    tipo: caso.tipo,
    empresa: caso.empresa,
    unidades: caso.misiones.length,
  }));
  return (
    <main className="panel mx-auto grid max-w-3xl grid-cols-1 gap-8 px-4 py-12 sm:px-6">
      <header className="mapa-cabeza">
        <p className="panel-ceja">{`$ git log --graph --reverse ${ruta.slug}`}</p>
        <h1>{ruta.titulo}</h1>
        <p className="panel-ruta-cargo">{ruta.cargo}</p>
        <p className="mapa-cabeza-texto">{ruta.descripcion}</p>
        {ruta.tecnologias.length > 0 ? (
          <p className="panel-tecnologias">
            <span>stack:</span>
            {ruta.tecnologias.map((tecnologia) => <code key={tecnologia}>{tecnologia}</code>)}
          </p>
        ) : null}
        <p className="mapa-cabeza-nota">Cada clase es una rama: aprendes en ella y se fusiona en el caso que la aplica, en un trabajo real.</p>
      </header>
      <MapaRuta ruta={{ slug: ruta.slug, titulo: ruta.titulo, beta: estado.estadoVigente === "beta" }} piezas={piezas} />
    </main>
  );
}
