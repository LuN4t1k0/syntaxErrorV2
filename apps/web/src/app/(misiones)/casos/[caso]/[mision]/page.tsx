import Link from "next/link";
import { notFound } from "next/navigation";
import { compilarMision } from "@syntaxerror/content/bloques";
import { archivosPython, paquetesPython } from "@syntaxerror/content/datos";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { AsistenteFlotante } from "@/components/ia/asistente-flotante";
import { componentesMision } from "@/components/mision/componentes";
import { LatidoPractica } from "@/components/mision/latido-practica";
import { MisionProvider } from "@/components/mision/mision-provider";
import { PreguntaDocente } from "@/components/mision/pregunta-docente";
import { Tutor } from "@/components/mision/tutor";
import { casosParaConstruir, casosSoloParaProbadores, obtenerCaso, rutasParaConstruir } from "@/lib/contenido";
import { requisitosDelCaso } from "@/lib/progreso/requisitos-contenido";
import { unidad } from "@/lib/unidad";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ caso: string; mision: string }> };

export async function generateStaticParams() {
  return (await casosParaConstruir()).flatMap((caso) => caso.misiones.map((mision) => ({ caso: caso.slug, mision: mision.slug })));
}

async function buscar(params: Parametros["params"]) {
  const { caso: slugCaso, mision: slugMision } = await params;
  const caso = await obtenerCaso(slugCaso);
  const indice = caso ? caso.misiones.findIndex((mision) => mision.slug === slugMision) : -1;
  return caso && indice >= 0 ? { caso, indice, mision: caso.misiones[indice] } : null;
}

export async function generateMetadata({ params }: Parametros) {
  const encontrada = await buscar(params);
  // Una misión solo de rutas en beta no se indexa hasta que se publique.
  const enBeta = encontrada ? (await casosSoloParaProbadores()).has(encontrada.caso.slug) : false;
  return { title: encontrada ? `${encontrada.mision.titulo} · ${encontrada.caso.titulo}` : "Misión", ...(enBeta ? { robots: { index: false, follow: false } } : {}) };
}

export default async function MisionPage({ params }: Parametros) {
  const encontrada = await buscar(params);
  if (!encontrada) notFound();
  const { caso, indice, mision } = encontrada;
  const Contenido = await compilarMision(mision.fuente);
  const usaPython = mision.bloques.some((bloque) => bloque.tipo === "PythonTask" || bloque.tipo === "PythonEjemplo");
  const anterior = caso.misiones[indice - 1];
  const siguiente = caso.misiones[indice + 1];
  const requisitos = requisitosDelCaso(await rutasParaConstruir(), await casosParaConstruir(), caso.slug);
  const soloProbadores = (await casosSoloParaProbadores()).has(caso.slug);
  const sinGuia = mision.sinGuia;
  const tareas = tareasDeMision(mision).map((tarea) => tarea.props.id);
  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      <nav className="text-sm" aria-label="Volver al caso"><Link className="font-bold text-accent hover:underline" href={`/casos/${caso.slug}`}>{`← ${caso.titulo}`}</Link></nav>
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-accent">{`> ${unidad(caso.tipo).nombre} ${indice + 1}/${caso.misiones.length} · ${mision.tiempo} min`}</p>
        <h1 className="text-3xl font-black">{mision.titulo}</h1>
        {sinGuia ? (
          <p className="card border-primary p-3 text-sm leading-6">
            <span className="badge mr-2">Misión sin guía</span>
            Aquí demuestras lo aprendido en el caso: no hay concepto, ejemplos ni pistas. El tutor te acompaña con preguntas después de varios intentos.
          </p>
        ) : null}
      </header>
      <MisionProvider
        caso={caso.slug}
        mision={mision.slug}
        tareas={tareas}
        python={usaPython ? { paquetes: paquetesPython(mision), archivos: archivosPython(caso) } : null}
        anterior={anterior ? { slug: anterior.slug, titulo: anterior.titulo, tareas: tareasDeMision(anterior).map((tarea) => tarea.props.id) } : null}
        requisitos={requisitos}
        sinGuia={sinGuia}
        soloProbadores={soloProbadores}
      >
        <article className="grid gap-6"><Contenido components={componentesMision(caso)} /></article>
        <Tutor caso={caso.slug} mision={mision.slug} />
      </MisionProvider>
      <PreguntaDocente caso={caso.slug} mision={mision.slug} />
      <nav className="flex justify-between gap-4 text-sm font-bold" aria-label="Misiones cercanas">
        {anterior ? <Link className="text-accent hover:underline" href={`/casos/${caso.slug}/${anterior.slug}`}>{`← ${anterior.titulo}`}</Link> : <span />}
        {siguiente ? <Link className="text-accent hover:underline" href={`/casos/${caso.slug}/${siguiente.slug}`}>{`${siguiente.titulo} →`}</Link> : null}
      </nav>
      <AsistenteFlotante caso={caso.slug} />
      <LatidoPractica />
    </main>
  );
}
