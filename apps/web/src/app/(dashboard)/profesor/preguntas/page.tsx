import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EVENTO_PREGUNTA_NUEVA } from "@syntaxerror/queue/eventos";
import { RefrescarConAvisos } from "@/components/avisos/refrescar-con-avisos";
import { ListaPreguntas } from "@/components/comunidad/lista-preguntas";
import { preguntasParaDocente } from "@/lib/preguntas-profesor";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Preguntas de estudiantes" };

export default async function PreguntasDocentePage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor/preguntas");
  if (!esDocente(usuario)) notFound();
  const preguntas = await preguntasParaDocente(getDb(), usuario);
  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-12 sm:px-6">
      <RefrescarConAvisos eventos={[EVENTO_PREGUNTA_NUEVA]} />
      <nav className="text-sm"><Link className="font-bold text-primary hover:underline" href="/profesor">← Panel docente</Link></nav>
      <p className="font-mono text-sm font-bold text-primary">{"> git pull origin preguntas"}</p>
      <h1 className="text-3xl font-black">Preguntas de estudiantes</h1>
      <p className="leading-7 text-muted-foreground">
        {usuario.rol === "admin"
          ? "Ves las preguntas de tus clases y las de estudiantes sin docente asignado."
          : "Ves las preguntas de estudiantes de tus clases sobre los casos habilitados."}
      </p>
      {preguntas.length === 0 ? <p className="text-muted-foreground">No hay preguntas por ahora.</p> : <ListaPreguntas preguntas={preguntas} modo="docente" />}
    </main>
  );
}
