import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { FormularioUnirse } from "@/components/comunidad/clases/formulario-unirse";
import { clasesDelEstudiante } from "@/lib/clases/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";
import { EmptyState } from "@/components/empty-state";
import { PageIntro } from "@/components/page-intro";

export const metadata = { title: "Tus clases" };

const ETIQUETAS = {
  pendiente: "Por aceptar",
  activa: "Activa",
  retirada: "Cerrada",
} as const;

export default async function ClasesPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/clases");
  const clases = await clasesDelEstudiante(getDb(), userId);

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-12 sm:px-6">
      <PageIntro
        comando="> git clone clase"
        titulo="Tus clases"
        descripcion="Si tu docente te dio un código, escríbelo aquí. Tus preguntas sobre los casos de la clase le llegarán a tu docente."
      />
      <section id="unirme-a-una-clase" className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Unirme a una clase</h2>
        <FormularioUnirse />
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Mis clases</h2>
        {clases.length === 0 ? (
          <EmptyState
            codigo="Sin clases"
            titulo="Tu primera clase empieza con un código"
            descripcion="Pídele el código a tu docente y escríbelo arriba para unirte."
            href="#unirme-a-una-clase"
            accion="Escribir el código"
          />
        ) : (
          <ul className="grid gap-3">
            {clases.map((clase) => (
              <li key={clase.id} className="card grid gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="block font-bold">{clase.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{`Docente: ${clase.docente}`}</span>
                  </span>
                  <span className="badge">{ETIQUETAS[clase.estado]}</span>
                </div>
                {clase.casos.length > 0 ? (
                  <ul className="flex flex-wrap gap-3 text-sm">
                    {clase.casos.map((caso) => (
                      <li key={caso.slug}>
                        <Link
                          className="font-bold text-accent hover:underline"
                          href={`/casos/${caso.slug}`}
                        >
                          {caso.titulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
