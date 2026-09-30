import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { FormularioClase } from "@/components/comunidad/clases/formulario-clase";
import { clasesDelProfesor } from "@/lib/clases/servicio";
import { rutasParaPublicar } from "@/lib/contenido";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Panel docente" };

export default async function ProfesorPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor");
  if (!esDocente(usuario)) notFound();
  const [clases, rutas] = await Promise.all([clasesDelProfesor(getDb(), usuario.id), rutasParaPublicar()]);

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> sudo -u docente"}</p>
        <h1 className="text-3xl font-black">Panel docente</h1>
        <p className="leading-7 text-muted-foreground">
          Crea clases, comparte su código y sigue el avance de tus estudiantes.{" "}
          <Link className="font-bold text-primary hover:underline" href="/profesor/preguntas">Ver las preguntas de tus estudiantes</Link>
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus clases</h2>
        {clases.length === 0 ? (
          <p className="text-muted-foreground">Todavía no creas ninguna clase.</p>
        ) : (
          <ul className="grid gap-3">
            {clases.map((clase) => (
              <li key={clase.id}>
                <Link href={`/profesor/clases/${clase.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-primary">
                  <span>
                    <span className="block font-bold">{clase.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{`${clase.ruta} · código ${clase.codigo}`}</span>
                  </span>
                  <span className="badge">{`${clase.activas} estudiantes · ${clase.pendientes} por aceptar`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Crear una clase</h2>
        <FormularioClase rutas={rutas.map((ruta) => ({ slug: ruta.slug, titulo: ruta.titulo }))} />
      </section>
    </main>
  );
}
