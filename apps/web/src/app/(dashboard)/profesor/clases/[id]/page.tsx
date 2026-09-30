import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { BotonesInscripcion } from "@/components/comunidad/clases/botones-inscripcion";
import { InterruptorCaso } from "@/components/comunidad/clases/interruptor-caso";
import { casosDeClase, claseDelProfesor, rosterDeClase } from "@/lib/clases/servicio";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { esUuid } from "@/lib/uuid";

export const metadata = { title: "Clase" };

export default async function ClasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect(`/login?callbackUrl=${encodeURIComponent(`/profesor/clases/${id}`)}`);
  if (!esDocente(usuario) || !esUuid(id)) notFound();
  const db = getDb();
  const clase = await claseDelProfesor(db, { profesorId: usuario.id, claseId: id });
  if (!clase) notFound();
  const [casos, roster] = await Promise.all([casosDeClase(db, id), rosterDeClase(db, { profesorId: usuario.id, claseId: id })]);
  const estudiantes = roster ?? [];
  const pendientes = estudiantes.filter((persona) => persona.estado === "pendiente");
  const activas = estudiantes.filter((persona) => persona.estado === "activa");
  const retiradas = estudiantes.filter((persona) => persona.estado === "retirada");

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6">
      <nav className="text-sm"><Link className="font-bold text-primary hover:underline" href="/profesor">← Panel docente</Link></nav>
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> clase"}</p>
        <h1 className="text-3xl font-black">{clase.titulo}</h1>
      </header>

      <section className="card grid gap-2 p-5">
        <h2 className="text-sm font-bold text-muted-foreground">Código para unirse</h2>
        <p data-testid="codigo-clase" className="font-mono text-4xl font-black tracking-widest">{clase.codigo}</p>
        <p className="text-sm text-muted-foreground">Tus estudiantes lo escriben en su panel, en «Tus clases». Tú aceptas cada solicitud.</p>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Solicitudes por aceptar</h2>
        {pendientes.length === 0 ? (
          <p className="text-muted-foreground">No hay solicitudes pendientes.</p>
        ) : (
          <ul className="grid gap-2">
            {pendientes.map((persona) => (
              <li key={persona.userId} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <span className="block font-bold">{persona.nombre ?? persona.email}</span>
                  <span className="block text-sm text-muted-foreground">{persona.email}</span>
                </span>
                <BotonesInscripcion claseId={id} userId={persona.userId} estado="pendiente" nombre={persona.nombre ?? persona.email} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Estudiantes</h2>
        {activas.length === 0 ? (
          <p className="text-muted-foreground">Cuando aceptes solicitudes, aquí verás el avance de cada estudiante.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2">Estudiante</th>
                  {casos.filter((caso) => caso.habilitado).map((caso) => (
                    <th key={caso.slug} className="p-2">{caso.titulo}</th>
                  ))}
                  <th className="p-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {activas.map((persona) => (
                  <tr key={persona.userId} className="border-b border-border">
                    <td className="p-2">
                      <span className="block font-bold">{persona.nombre ?? persona.email}</span>
                      <span className="block text-xs text-muted-foreground">{persona.email}</span>
                    </td>
                    {persona.casos.map((avance) => (
                      <td key={avance.slug} className="p-2">{avance.completo ? "Completo" : `${avance.aprobadas}/${avance.total} misiones`}</td>
                    ))}
                    <td className="p-2">
                      <BotonesInscripcion claseId={id} userId={persona.userId} estado="activa" nombre={persona.nombre ?? persona.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Casos de la clase</h2>
        <p className="text-sm text-muted-foreground">Las preguntas de tus estudiantes sobre los casos habilitados te llegan a ti.</p>
        <div className="grid gap-2">
          {casos.map((caso) => (
            <InterruptorCaso key={caso.slug} claseId={id} caso={caso.slug} titulo={caso.titulo} habilitado={caso.habilitado} />
          ))}
        </div>
      </section>

      {retiradas.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-black">Fuera de la clase</h2>
          <ul className="grid gap-2">
            {retiradas.map((persona) => (
              <li key={persona.userId} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>{persona.nombre ?? persona.email}</span>
                <BotonesInscripcion claseId={id} userId={persona.userId} estado="retirada" nombre={persona.nombre ?? persona.email} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
