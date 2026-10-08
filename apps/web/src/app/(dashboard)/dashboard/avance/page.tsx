import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { ListaEntregas } from "@/components/avance/entregas";
import { GitLogRutas } from "@/components/avance/git-log-rutas";
import { SeccionTerminal } from "@/components/avance/terminal";
import { avanceDelAlumno } from "@/lib/avance/datos";
import { siguienteDelAvance, trabasDelAlumno } from "@/lib/avance/trabas";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Tu avance" };

export default async function AvancePage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/avance");
  const avance = await avanceDelAlumno(getDb(), userId);
  if (!avance) notFound();
  const trabas = trabasDelAlumno(avance, new Date());
  const siguiente = siguienteDelAvance(avance);
  // El alumno ve sus trabas como pasos a seguir, sin el conteo de fallidos ni los datos de su cuenta.
  const trabadas = new Set(trabas.filter((traba) => traba.tipo === "leccion").map((traba) => traba.href));
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <SeccionTerminal comando="whoami" etiqueta="Tu perfil">
        <h1 className="font-sans text-3xl font-black">Tu avance</h1>
        <p className="text-muted-foreground">{`${avance.perfil.nombre ?? avance.perfil.email} · nivel ${avance.perfil.nivel.nivel} (${avance.perfil.nivel.puntos} puntos)`}</p>
      </SeccionTerminal>
      <SeccionTerminal comando="next" etiqueta="Qué sigue">
        {trabas.length > 0 ? (
          <ul className="grid gap-2">
            {trabas.map((traba) => (
              <li key={`${traba.tipo}-${traba.href}`}>
                <Link href={traba.href} className="hover:underline">{`→ ${traba.alumno}`}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>{`→ ${siguiente.texto}`}</p>
        )}
        <div>
          <Link href={trabas[0]?.href ?? siguiente.href} className="btn btn-primary font-sans">Ir ahora</Link>
        </div>
      </SeccionTerminal>
      <GitLogRutas rutas={avance.rutas} otrosCasos={avance.otrosCasos} modo="alumno" trabadas={trabadas} />
      <ListaEntregas entregas={avance.entregas} modo="alumno" email={avance.perfil.email} />
    </main>
  );
}
