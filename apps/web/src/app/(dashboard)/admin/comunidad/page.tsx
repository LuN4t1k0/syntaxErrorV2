import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { BotonAccion } from "@/components/admin/boton-accion";
import { adminDePagina } from "@/lib/admin/acceso";
import { listarComentariosPendientes, listarSolicitudesPendientes } from "@/lib/admin/moderacion";

export const metadata = { title: "Solicitudes y reseñas · Administración" };
const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

export default async function ComunidadAdminPage() {
  await adminDePagina("/admin/comunidad");
  const [solicitudes, comentarios] = await Promise.all([listarSolicitudesPendientes(getDb()), listarComentariosPendientes(getDb())]);
  return (
    <main className="grid gap-8">
      <h1 className="text-3xl font-black">Solicitudes y reseñas</h1>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Solicitudes de acceso docente</h2>
        {solicitudes.length === 0 ? <p className="text-muted-foreground">No hay solicitudes pendientes.</p> : <ul className="grid gap-2">{solicitudes.map((s) => <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4"><span><Link className="block font-bold text-primary hover:underline" href={`/admin/usuarios/${s.userId}`}>{s.nombre ?? s.email}</Link><span className="block text-sm text-muted-foreground">{`${s.email} · ${fecha(s.creadaEn)}`}</span></span><span className="flex flex-wrap gap-2"><BotonAccion url={`/api/admin/solicitudes/${s.id}`} cuerpo={{ decision: "aprobada" }} etiqueta="Aprobar" /><BotonAccion url={`/api/admin/solicitudes/${s.id}`} cuerpo={{ decision: "rechazada" }} etiqueta="Rechazar" variante="ghost" /></span></li>)}</ul>}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Comentarios de reseñas</h2>
        {comentarios.length === 0 ? <p className="text-muted-foreground">No hay comentarios pendientes.</p> : <ul className="grid gap-2">{comentarios.map((c) => <li key={c.id} className="card grid gap-2 p-4"><p className="text-sm text-muted-foreground">{`${c.caso.titulo} · ${c.estrellas}/5 · ${c.nombre ?? c.email} · ${fecha(c.creadaEn)}`}</p><p className="whitespace-pre-wrap leading-7">{c.comentario}</p><span className="flex flex-wrap gap-2"><BotonAccion url={`/api/admin/resenas/${c.id}`} cuerpo={{ decision: "aprobado" }} etiqueta="Publicar comentario" /><BotonAccion url={`/api/admin/resenas/${c.id}`} cuerpo={{ decision: "rechazado" }} etiqueta="Ocultar" variante="ghost" /></span></li>)}</ul>}
      </section>
    </main>
  );
}
