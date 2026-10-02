import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RUBRICA_BASE } from "@syntaxerror/content/rubrica";
import { getDb } from "@syntaxerror/db/client";
import { FormularioRevision } from "@/components/comunidad/formulario-revision";
import { casosParaPublicar } from "@/lib/contenido";
import { listarEntregablesPorRevisar } from "@/lib/entregables/revision";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Entregables por revisar" };

const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

export default async function EntregablesPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor/entregables");
  if (!esDocente(usuario)) notFound();
  const [lista, casos] = await Promise.all([listarEntregablesPorRevisar(getDb(), usuario), casosParaPublicar()]);
  const rubricaDe = (slug: string) => casos.find((caso) => caso.slug === slug)?.rubrica ?? RUBRICA_BASE;

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-12 sm:px-6">
      <nav className="text-sm"><Link className="font-bold text-primary hover:underline" href="/profesor">← Panel docente</Link></nav>
      <p className="font-mono text-sm font-bold text-primary">{"> git review"}</p>
      <h1 className="text-3xl font-black">Entregables por revisar</h1>
      <p className="leading-7 text-muted-foreground">
        La plataforma ya verificó que cada repositorio es público, tiene README y los archivos del caso. Abre el repositorio y ponle un puntaje de 1 a 3 en cada dimensión de la rúbrica: con 2 o más en las tres se aprueba; con un 1 se piden cambios, y esa dimensión necesita un comentario sobre qué corregir.
      </p>
      {lista.length === 0 ? (
        <p className="text-muted-foreground">No hay entregables por revisar.</p>
      ) : (
        <ul className="grid gap-4">
          {lista.map((entregable) => (
            <li key={entregable.id} className="card grid gap-3 p-5">
              <div className="grid gap-1">
                <p className="font-bold">{`${entregable.caso.titulo} · ${entregable.estudiante.nombre ?? entregable.estudiante.email}`}</p>
                <p className="text-xs text-muted-foreground">{`${entregable.estudiante.email} · enviado el ${fecha(entregable.enviadoEn)}`}</p>
                <a className="w-fit font-bold text-primary hover:underline" href={entregable.url} target="_blank" rel="noopener noreferrer">Abrir el repositorio</a>
              </div>
              <FormularioRevision entregableId={entregable.id} rubrica={rubricaDe(entregable.caso.slug)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
