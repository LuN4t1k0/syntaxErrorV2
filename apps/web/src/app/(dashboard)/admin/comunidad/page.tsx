import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { BotonAccion } from "@/components/admin/boton-accion";
import { Paginacion } from "@/components/admin/paginacion";
import { adminDePagina } from "@/lib/admin/acceso";
import { paginaComentariosPendientes, paginaSolicitudesPendientes } from "@/lib/admin/moderacion";
import { leerPagina } from "@/lib/admin/paginacion";

export const metadata = { title: "Solicitudes y reseñas · Administración" };
const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

type Parametros = { searchParams: Promise<{ solicitudes?: string; comentarios?: string }> };

// Dos listas en la misma página, cada una con su paginación: `solicitudes` y `comentarios` son sus números de página.
export default async function ComunidadAdminPage({ searchParams }: Parametros) {
  await adminDePagina("/admin/comunidad");
  const parametros = await searchParams;
  const paginaSolicitudes = leerPagina(parametros.solicitudes);
  const paginaComentarios = leerPagina(parametros.comentarios);
  const [solicitudes, comentarios] = await Promise.all([
    paginaSolicitudesPendientes(getDb(), { pagina: paginaSolicitudes }),
    paginaComentariosPendientes(getDb(), { pagina: paginaComentarios }),
  ]);
  const conservar = { solicitudes: String(paginaSolicitudes), comentarios: String(paginaComentarios) };
  return (
    <main className="grid gap-8">
      <h1 className="text-3xl font-black">Solicitudes y reseñas</h1>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">{`Solicitudes de acceso docente (${solicitudes.total})`}</h2>
        {solicitudes.filas.length === 0 ? (
          <p className="text-muted-foreground">No hay solicitudes pendientes.</p>
        ) : (
          <ul className="grid gap-2">
            {solicitudes.filas.map((s) => (
              <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <Link className="block font-bold text-accent hover:underline" href={`/admin/usuarios/${s.userId}`}>
                    {s.nombre ?? s.email}
                  </Link>
                  <span className="block text-sm text-muted-foreground">{`${s.email} · ${fecha(s.creadaEn)}`}</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <BotonAccion url={`/api/admin/solicitudes/${s.id}`} cuerpo={{ decision: "aprobada" }} etiqueta="Aprobar" icono="aprobar" />
                  <BotonAccion
                    url={`/api/admin/solicitudes/${s.id}`}
                    cuerpo={{ decision: "rechazada" }}
                    etiqueta="Rechazar"
                    variante="ghost"
                    icono="rechazar"
                    confirmar="La persona recibe un mensaje de que por ahora no se aprobó su acceso docente."
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
        <Paginacion ruta="/admin/comunidad" parametros={conservar} parametro="solicitudes" pagina={solicitudes.pagina} paginas={solicitudes.paginas} etiqueta="Páginas de solicitudes" />
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">{`Comentarios de reseñas (${comentarios.total})`}</h2>
        {comentarios.filas.length === 0 ? (
          <p className="text-muted-foreground">No hay comentarios pendientes.</p>
        ) : (
          <ul className="grid gap-2">
            {comentarios.filas.map((c) => (
              <li key={c.id} className="card grid gap-2 p-4">
                <p className="text-sm text-muted-foreground">{`${c.caso.titulo} · ${c.estrellas}/5 · ${c.nombre ?? c.email} · ${fecha(c.creadaEn)}`}</p>
                <p className="whitespace-pre-wrap leading-7">{c.comentario}</p>
                <span className="flex flex-wrap gap-2">
                  <BotonAccion url={`/api/admin/resenas/${c.id}`} cuerpo={{ decision: "aprobado" }} etiqueta="Publicar comentario" icono="aprobar" />
                  <BotonAccion url={`/api/admin/resenas/${c.id}`} cuerpo={{ decision: "rechazado" }} etiqueta="Ocultar" variante="ghost" icono="ocultar" />
                </span>
              </li>
            ))}
          </ul>
        )}
        <Paginacion ruta="/admin/comunidad" parametros={conservar} parametro="comentarios" pagina={comentarios.pagina} paginas={comentarios.paginas} etiqueta="Páginas de comentarios" />
      </section>
    </main>
  );
}
