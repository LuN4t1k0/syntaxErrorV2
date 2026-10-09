import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EVENTO_PREGUNTA_RESPONDIDA } from "@syntaxerror/queue/eventos";
import { RefrescarConAvisos } from "@/components/avisos/refrescar-con-avisos";
import { ListaPreguntas } from "@/components/comunidad/lista-preguntas";
import { preguntasDelEstudiante } from "@/lib/preguntas-profesor";
import { obtenerUsuarioId } from "@/lib/sesion";
import { EmptyState } from "@/components/empty-state";
import { PageIntro } from "@/components/page-intro";

export const metadata = { title: "Tus preguntas" };

export default async function MisPreguntasPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/preguntas");
  const preguntas = await preguntasDelEstudiante(getDb(), userId);
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <RefrescarConAvisos eventos={[EVENTO_PREGUNTA_RESPONDIDA]} />
      <PageIntro
        comando="> git log --preguntas"
        titulo="Tus preguntas"
        descripcion="Tus dudas y las respuestas de docentes quedan juntas para que puedas retomarlas."
      />
      {preguntas.length === 0 ? (
        <EmptyState
          codigo="Sin preguntas"
          titulo="Pregunta cuando lo necesites"
          descripcion="Cada misión tiene un espacio para consultar a un docente. Tu pregunta y su respuesta aparecerán aquí."
          href="/dashboard"
          accion="Ir a tus lecciones"
        />
      ) : (
        <ListaPreguntas preguntas={preguntas} modo="estudiante" />
      )}
    </main>
  );
}
