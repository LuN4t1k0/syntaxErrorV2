import { asc } from "drizzle-orm";
import { getDb } from "@syntaxerror/db/client";
import { casos } from "@syntaxerror/db/schema";
import { Button } from "@syntaxerror/ui/components/button";
import { BotonAccion } from "@/components/admin/boton-accion";
import { Paginacion } from "@/components/admin/paginacion";
import { adminDePagina } from "@/lib/admin/acceso";
import { leerPagina } from "@/lib/admin/paginacion";
import { listarCacheTutor } from "@/lib/admin/preguntas";
import { etiquetaDeMision } from "@/lib/tutor/etiqueta";

export const metadata = { title: "Caché del tutor · Administración" };

export default async function CacheTutorPage({ searchParams }: { searchParams: Promise<{ caso?: string; pagina?: string }> }) {
  await adminDePagina("/admin/tutor");
  const parametros = await searchParams;
  const db = getDb();
  const listaCasos = await db.select({ slug: casos.slug, titulo: casos.titulo }).from(casos).orderBy(asc(casos.titulo));
  const casoSlug = listaCasos.some((caso) => caso.slug === parametros.caso) ? parametros.caso : undefined;
  const resultado = await listarCacheTutor(db, { casoSlug, pagina: leerPagina(parametros.pagina) });
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl font-black">Caché del tutor</h1>
      <p className="max-w-3xl leading-7 text-muted-foreground">Si una respuesta es mala, bórrala: la próxima pregunta parecida se responderá de nuevo con la IA.</p>
      <form className="flex flex-wrap items-end gap-3" method="get"><label className="grid gap-1 text-sm font-bold">Caso<select name="caso" defaultValue={casoSlug ?? ""} className="h-10 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground"><option value="">Todos</option>{listaCasos.map((caso) => <option key={caso.slug} value={caso.slug}>{caso.titulo}</option>)}</select></label><Button type="submit" variant="secondary">Filtrar</Button></form>
      <ul className="grid gap-3">{resultado.filas.map((fila) => <li key={fila.id} className="card grid gap-2 p-4"><p className="text-xs text-muted-foreground">{`${fila.caso.titulo} · ${etiquetaDeMision(fila.mision)}`}</p><p className="font-bold">{fila.pregunta}</p><p className="whitespace-pre-wrap text-sm leading-6">{fila.respuesta}</p><div><BotonAccion url={`/api/admin/tutor/cache/${fila.id}`} metodo="DELETE" etiqueta="Borrar de la caché" variante="destructive" confirmar="¿Borrar esta respuesta?" /></div></li>)}</ul>
      {resultado.total === 0 ? <p className="text-muted-foreground">No hay respuestas en caché.</p> : null}
      <Paginacion ruta="/admin/tutor" parametros={casoSlug ? { caso: casoSlug } : {}} pagina={resultado.pagina} paginas={resultado.paginas} />
    </main>
  );
}
