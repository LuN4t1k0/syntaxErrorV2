import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { Paginacion } from "@/components/admin/paginacion";
import { adminDePagina } from "@/lib/admin/acceso";
import { leerPagina } from "@/lib/admin/paginacion";
import { ESTADOS_TUTOR, listarPreguntasDocentes, listarPreguntasTutor, type EstadoPreguntaTutor } from "@/lib/admin/preguntas";

export const metadata = { title: "Preguntas · Administración" };
const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });
const ETIQUETAS_TUTOR: Record<EstadoPreguntaTutor, string> = { pendiente: "Pendiente", respondida: "Respondida", desde_cache: "Desde caché", fuera_de_tema: "Fuera de tema", error: "Error" };
function Filtro({ href, activo, texto }: { href: string; activo: boolean; texto: string }) { return <Link className={activo ? "font-bold text-foreground" : "font-bold text-primary hover:underline"} href={href}>{texto}</Link>; }

export default async function PreguntasAdminPage({ searchParams }: { searchParams: Promise<{ vista?: string; estado?: string; pagina?: string }> }) {
  await adminDePagina("/admin/preguntas");
  const parametros = await searchParams;
  const vista = parametros.vista === "tutor" ? "tutor" : "docentes";
  const pagina = leerPagina(parametros.pagina);
  const db = getDb();
  if (vista === "tutor") {
    const estado = (ESTADOS_TUTOR as readonly string[]).includes(parametros.estado ?? "") ? (parametros.estado as EstadoPreguntaTutor) : undefined;
    const resultado = await listarPreguntasTutor(db, { estado, pagina });
    return <main className="grid gap-6"><h1 className="text-3xl font-black">Preguntas</h1><nav className="flex gap-4 text-sm" aria-label="Vista"><Filtro href="/admin/preguntas" activo={false} texto="A docentes" /><Filtro href="/admin/preguntas?vista=tutor" activo texto="Al tutor IA" /></nav><nav className="flex flex-wrap gap-4 text-sm" aria-label="Estado"><Filtro href="/admin/preguntas?vista=tutor" activo={!estado} texto="Todas" />{ESTADOS_TUTOR.map((opcion) => <Filtro key={opcion} href={`/admin/preguntas?vista=tutor&estado=${opcion}`} activo={estado === opcion} texto={ETIQUETAS_TUTOR[opcion]} />)}</nav><ul className="grid gap-3">{resultado.filas.map((fila) => <li key={fila.id} className="card grid gap-2 p-4"><p className="text-xs text-muted-foreground">{`${fila.caso.titulo} · ${fila.mision} · ${fila.estudiante} · ${fila.estado} · ${fecha(fila.creadoEn)}`}</p><p className="whitespace-pre-wrap leading-7">{fila.pregunta}</p>{fila.respuesta ? <p className="whitespace-pre-wrap rounded-md border border-border p-3 text-sm">{fila.respuesta}</p> : null}</li>)}</ul><Paginacion ruta="/admin/preguntas" parametros={estado ? { vista: "tutor", estado } : { vista: "tutor" }} pagina={resultado.pagina} paginas={resultado.paginas} /></main>;
  }
  const estado = parametros.estado === "pendiente" || parametros.estado === "respondida" ? parametros.estado : undefined;
  const resultado = await listarPreguntasDocentes(db, { estado, pagina });
  return <main className="grid gap-6"><h1 className="text-3xl font-black">Preguntas</h1><nav className="flex gap-4 text-sm" aria-label="Vista"><Filtro href="/admin/preguntas" activo texto="A docentes" /><Filtro href="/admin/preguntas?vista=tutor" activo={false} texto="Al tutor IA" /></nav><p className="text-sm text-muted-foreground">Las preguntas sin docente asignado se responden desde <Link className="font-bold text-primary hover:underline" href="/profesor/preguntas">el panel docente</Link>.</p><nav className="flex gap-4 text-sm" aria-label="Estado"><Filtro href="/admin/preguntas" activo={!estado} texto="Todas" /><Filtro href="/admin/preguntas?estado=pendiente" activo={estado === "pendiente"} texto="Pendientes" /><Filtro href="/admin/preguntas?estado=respondida" activo={estado === "respondida"} texto="Respondidas" /></nav><ul className="grid gap-3">{resultado.filas.map((fila) => <li key={fila.id} className="card grid gap-2 p-4"><p className="text-xs text-muted-foreground">{`${fila.caso.titulo} · ${fila.mision} · ${fila.estudiante} · ${fila.docente ? `Docente: ${fila.docente}` : "Sin docente"} · ${fecha(fila.creadaEn)}`}</p><p className="whitespace-pre-wrap leading-7">{fila.texto}</p>{fila.respuesta ? <p className="whitespace-pre-wrap rounded-md border border-primary/30 p-3 text-sm">{fila.respuesta}</p> : <span className="badge w-fit">Pendiente</span>}</li>)}</ul><Paginacion ruta="/admin/preguntas" parametros={estado ? { estado } : {}} pagina={resultado.pagina} paginas={resultado.paginas} /></main>;
}
