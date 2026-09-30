import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { BotonMarcarLeido } from "@/components/comunidad/boton-marcar-leido";
import { listarMensajes } from "@/lib/mensajes";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Tus mensajes" };

export default async function MensajesPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/mensajes");
  const lista = await listarMensajes(getDb(), userId);
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> cat ~/mensajes"}</p>
      <h1 className="text-3xl font-black">Tus mensajes</h1>
      {lista.length === 0 ? (
        <p className="text-muted-foreground">No tienes mensajes. Cuando el equipo te escriba, por ejemplo al revisar un reporte, aparecerá aquí.</p>
      ) : (
        <ul className="grid gap-3">
          {lista.map((mensaje) => (
            <li key={mensaje.id} className={mensaje.leido ? "card grid gap-2 p-4" : "card grid gap-2 border-primary p-4"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{mensaje.asunto}</h2>
                {mensaje.leido ? null : <span className="badge">Nuevo</span>}
              </div>
              <p className="text-xs text-muted-foreground">{mensaje.creadoEn.toLocaleString("es-CL", { timeZone: "America/Santiago" })}</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{mensaje.cuerpo}</p>
              {mensaje.leido ? null : <div><BotonMarcarLeido id={mensaje.id} /></div>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
