import Link from "next/link";
import { notFound } from "next/navigation";
import { compilarMision } from "@syntaxerror/content/bloques";
import { archivosPython, paquetesPython } from "@syntaxerror/content/datos";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { componentesMision } from "@/components/mision/componentes";
import { MisionProvider } from "@/components/mision/mision-provider";
import { Tutor } from "@/components/mision/tutor";
import { casosParaPublicar, obtenerCaso } from "@/lib/contenido";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ caso: string; mision: string }> };

export async function generateStaticParams() {
  return (await casosParaPublicar()).flatMap((caso) => caso.misiones.map((mision) => ({ caso: caso.slug, mision: mision.slug })));
}

async function buscar(params: Parametros["params"]) {
  const { caso: slugCaso, mision: slugMision } = await params;
  const caso = await obtenerCaso(slugCaso);
  const indice = caso ? caso.misiones.findIndex((mision) => mision.slug === slugMision) : -1;
  return caso && indice >= 0 ? { caso, indice, mision: caso.misiones[indice] } : null;
}

export async function generateMetadata({ params }: Parametros) {
  const encontrada = await buscar(params);
  return { title: encontrada ? `${encontrada.mision.titulo} · ${encontrada.caso.titulo}` : "Misión" };
}

export default async function MisionPage({ params }: Parametros) {
  const encontrada = await buscar(params);
  if (!encontrada) notFound();
  const { caso, indice, mision } = encontrada;
  const Contenido = await compilarMision(mision.fuente);
  const usaPython = mision.bloques.some((bloque) => bloque.tipo === "PythonTask" || bloque.tipo === "PythonEjemplo");
  const anterior = caso.misiones[indice - 1];
  const siguiente = caso.misiones[indice + 1];
  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      <nav className="text-sm"><Link className="font-bold text-primary hover:underline" href={`/casos/${caso.slug}`}>{`← ${caso.titulo}`}</Link></nav>
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{`> misión ${indice + 1}/${caso.misiones.length} · ${mision.tiempo} min`}</p>
        <h1 className="text-3xl font-black">{mision.titulo}</h1>
      </header>
      <MisionProvider caso={caso.slug} mision={mision.slug} tareas={tareasDeMision(mision).map((tarea) => tarea.props.id)} python={usaPython ? { paquetes: paquetesPython(mision), archivos: archivosPython(caso) } : null}>
        <article className="grid gap-6"><Contenido components={componentesMision(caso)} /></article>
      </MisionProvider>
      <Tutor caso={caso.slug} mision={mision.slug} />
      <nav className="flex justify-between gap-4 text-sm font-bold">
        {anterior ? <Link className="text-primary hover:underline" href={`/casos/${caso.slug}/${anterior.slug}`}>{`← ${anterior.titulo}`}</Link> : <span />}
        {siguiente ? <Link className="text-primary hover:underline" href={`/casos/${caso.slug}/${siguiente.slug}`}>{`${siguiente.titulo} →`}</Link> : null}
      </nav>
    </main>
  );
}
