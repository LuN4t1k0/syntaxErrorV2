import { notFound } from "next/navigation";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { PanelCaso } from "@/components/mision/panel-caso";
import { casosParaPublicar, obtenerCaso } from "@/lib/contenido";

export const dynamicParams = false;
type Parametros = { params: Promise<{ caso: string }> };

export async function generateStaticParams() {
  return (await casosParaPublicar()).map((caso) => ({ caso: caso.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  return { title: caso?.titulo ?? "Caso" };
}

export default async function CasoPage({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  if (!caso) notFound();
  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`> caso: ${caso.empresa}`}</p>
        <h1 className="text-3xl font-black">{caso.titulo}</h1>
        <p className="leading-7 text-muted-foreground">{`Llegas como ${caso.cargo.toLowerCase()} a ${caso.empresa}. Datos del caso: ${caso.dataset}.`}</p>
      </header>
      <PanelCaso caso={caso.slug} entregable={caso.entregable} misiones={caso.misiones.map((mision) => ({ slug: mision.slug, titulo: mision.titulo, tiempo: mision.tiempo, tareas: tareasDeMision(mision).map((tarea) => tarea.props.id) }))} />
    </main>
  );
}
