import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EVENTO_PREGUNTA_RESPONDIDA } from "@syntaxerror/queue/eventos";
import { RefrescarConAvisos } from "@/components/avisos/refrescar-con-avisos";
import { ListaPreguntas } from "@/components/comunidad/lista-preguntas";
import { preguntasDelEstudiante } from "@/lib/preguntas-profesor";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Tus preguntas" };

export default async function MisPreguntasPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/preguntas");
  const preguntas = await preguntasDelEstudiante(getDb(), userId);
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <RefrescarConAvisos eventos={[EVENTO_PREGUNTA_RESPONDIDA]} />
      <p className="font-mono text-sm font-bold text-primary">{"> git log --preguntas"}</p>
      <h1 className="text-3xl font-black">Tus preguntas</h1>
      {preguntas.length === 0 ? (
        <p className="text-muted-foreground">Todavía no preguntas nada. En cada misión puedes preguntarle a un docente.</p>
      ) : (
        <ListaPreguntas preguntas={preguntas} modo="estudiante" />
      )}
    </main>
  );
}
