import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { BotonAccion } from "@/components/admin/boton-accion";
import { Paginacion } from "@/components/admin/paginacion";
import { FormularioClase } from "@/components/comunidad/clases/formulario-clase";
import { leerPagina } from "@/lib/admin/paginacion";
import { paginaClasesDelProfesor } from "@/lib/clases/servicio";
import { esDocente } from "@/lib/roles";
import { rutasParaClases } from "@/lib/rutas/estado";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Panel docente" };

export default async function ProfesorPage({ searchParams }: { searchParams: Promise<{ vista?: string; pagina?: string }> }) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor");
  if (!esDocente(usuario)) notFound();
  const parametros = await searchParams;
  // Las archivadas salen del panel, pero quedan a mano para restaurarlas.
  const estado = parametros.vista === "archivadas" ? "archivada" : "activa";
  const [resultado, rutas] = await Promise.all([paginaClasesDelProfesor(getDb(), usuario.id, { estado, pagina: leerPagina(parametros.pagina) }), rutasParaClases(getDb(), usuario.id)]);
  const clases = resultado.filas;

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> sudo -u docente"}</p>
        <h1 className="text-3xl font-black">Panel docente</h1>
        <p className="leading-7 text-muted-foreground">
          Crea clases, comparte su código y sigue el avance de tus estudiantes.{" "}
          <Link className="font-bold text-primary hover:underline" href="/profesor/preguntas">Ver las preguntas de tus estudiantes</Link>{" · "}
          <Link className="font-bold text-primary hover:underline" href="/profesor/entregables">Revisar entregables</Link>
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus clases</h2>
        <nav className="flex flex-wrap gap-4 text-sm" aria-label="Clases activas o archivadas">
          <Link href="/profesor" aria-current={estado === "activa" ? "page" : undefined} className={estado === "activa" ? "font-bold text-foreground" : "font-bold text-primary hover:underline"}>
            {`Activas (${resultado.activas})`}
          </Link>
          <Link href="/profesor?vista=archivadas" aria-current={estado === "archivada" ? "page" : undefined} className={estado === "archivada" ? "font-bold text-foreground" : "font-bold text-primary hover:underline"}>
            {`Archivadas (${resultado.archivadas})`}
          </Link>
        </nav>
        {clases.length === 0 ? (
          <p className="text-muted-foreground">{estado === "archivada" ? "No tienes clases archivadas." : "Todavía no creas ninguna clase."}</p>
        ) : (
          <ul className="grid gap-3">
            {clases.map((clase) => (
              <li key={clase.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <Link href={`/profesor/clases/${clase.id}`} className="grid min-w-0 gap-0.5 hover:underline">
                  <span className="block font-bold">{clase.titulo}</span>
                  <span className="block text-sm text-muted-foreground">{`${clase.ruta} · código ${clase.codigo}`}</span>
                </Link>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="badge">{`${clase.activas} estudiantes · ${clase.pendientes} por aceptar`}</span>
                  {estado === "activa" ? (
                    <BotonAccion
                      url={`/api/profesor/clases/${clase.id}`}
                      metodo="PATCH"
                      cuerpo={{ estado: "archivada" }}
                      etiqueta="Archivar"
                      variante="ghost"
                      icono="archivar"
                      confirmar={`«${clase.titulo}» sale de tu panel y su código deja de aceptar estudiantes nuevos. El avance de sus estudiantes no cambia, y puedes restaurarla cuando quieras.`}
                    />
                  ) : (
                    <BotonAccion url={`/api/profesor/clases/${clase.id}`} metodo="PATCH" cuerpo={{ estado: "activa" }} etiqueta="Restaurar" variante="ghost" icono="restaurar" />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Paginacion ruta="/profesor" parametros={estado === "archivada" ? { vista: "archivadas" } : {}} pagina={resultado.pagina} paginas={resultado.paginas} />
      </section>

      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Crear una clase</h2>
        <FormularioClase rutas={rutas.map((ruta) => ({ slug: ruta.slug, titulo: ruta.titulo }))} />
      </section>
    </main>
  );
}
