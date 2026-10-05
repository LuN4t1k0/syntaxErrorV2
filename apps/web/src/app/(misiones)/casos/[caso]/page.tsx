import { notFound } from "next/navigation";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { ResenasCaso } from "@/components/comunidad/resenas-caso";
import { AsistenteFlotante } from "@/components/ia/asistente-flotante";
import { DatosDelCaso } from "@/components/mision/datos-del-caso";
import { PanelCaso } from "@/components/mision/panel-caso";
import { RubricaDelCaso } from "@/components/mision/rubrica-del-caso";
import { casosParaConstruir, casosSoloParaProbadores, obtenerCaso, rutasParaConstruir } from "@/lib/contenido";
import { requisitosDelCaso } from "@/lib/progreso/requisitos-contenido";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ caso: string }> };

export async function generateStaticParams() {
  return (await casosParaConstruir()).map((caso) => ({ caso: caso.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  // Un caso solo de rutas en beta no se indexa hasta que se publique.
  const enBeta = caso ? (await casosSoloParaProbadores()).has(caso.slug) : false;
  return { title: caso?.titulo ?? "Caso", ...(enBeta ? { robots: { index: false, follow: false } } : {}) };
}

export default async function CasoPage({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  if (!caso) notFound();
  const requisitos = requisitosDelCaso(await rutasParaConstruir(), await casosParaConstruir(), caso.slug);
  const soloProbadores = (await casosSoloParaProbadores()).has(caso.slug);
  const esClases = caso.tipo === "clases";
  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{esClases ? "> clases" : `> caso: ${caso.empresa}`}</p>
        <h1 className="text-3xl font-black">{caso.titulo}</h1>
        <p className="leading-7 text-muted-foreground">
          {esClases
            ? `Una lección por tema, paso a paso y con datos de práctica: ${caso.dataset}. Al aprobarlas todas se habilita el caso siguiente, donde las usas en un trabajo real.`
            : `Llegas como ${caso.cargo.toLowerCase()} a ${caso.empresa}. Datos del caso: ${caso.dataset}.`}
        </p>
      </header>
      <PanelCaso
        soloProbadores={soloProbadores}
        caso={caso.slug}
        tipo={caso.tipo}
        entregable={caso.entregable}
        requisitos={requisitos}
        misiones={caso.misiones.map((mision) => ({ slug: mision.slug, titulo: mision.titulo, tiempo: mision.tiempo, sinGuia: mision.sinGuia, tareas: tareasDeMision(mision).map((tarea) => tarea.props.id) }))}
      />
      {esClases ? null : <RubricaDelCaso rubrica={caso.rubrica} />}
      <DatosDelCaso caso={caso.slug} datos={caso.datos} />
      <ResenasCaso caso={caso.slug} />
      <AsistenteFlotante caso={caso.slug} />
    </main>
  );
}
