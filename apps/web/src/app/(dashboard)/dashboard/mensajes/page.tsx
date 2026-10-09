import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { BotonMarcarLeido } from "@/components/comunidad/boton-marcar-leido";
import { listarMensajes } from "@/lib/mensajes";
import { obtenerUsuarioId } from "@/lib/sesion";
import { EmptyState } from "@/components/empty-state";
import { PageIntro } from "@/components/page-intro";

export const metadata = { title: "Tus mensajes" };

export default async function MensajesPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/mensajes");
  const lista = await listarMensajes(getDb(), userId);
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <PageIntro
        comando="> cat ~/mensajes"
        titulo="Tus mensajes"
        descripcion="Aquí encontrarás avisos sobre tus preguntas, reportes y acceso docente."
      />
      {lista.length === 0 ? (
        <EmptyState
          codigo="Bandeja al día"
          titulo="Aún no tienes mensajes"
          descripcion="Cuando el equipo revise un reporte o responda una solicitud, lo verás aquí."
          href="/dashboard"
          accion="Volver a tu panel"
        />
      ) : (
        <ul className="grid gap-3">
          {lista.map((mensaje) => (
            <li
              key={mensaje.id}
              className={
                mensaje.leido
                  ? "card grid gap-2 p-4"
                  : "card grid gap-2 border-primary p-4"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{mensaje.asunto}</h2>
                {mensaje.leido ? null : <span className="badge">Nuevo</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {mensaje.creadoEn.toLocaleString("es-CL", {
                  timeZone: "America/Santiago",
                })}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6">
                {mensaje.cuerpo}
              </p>
              {mensaje.leido ? null : (
                <div>
                  <BotonMarcarLeido id={mensaje.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
