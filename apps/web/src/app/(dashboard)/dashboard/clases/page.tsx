import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { FormularioUnirse } from "@/components/comunidad/clases/formulario-unirse";
import { clasesDelEstudiante } from "@/lib/clases/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Tus clases" };

const ETIQUETAS = { pendiente: "Por aceptar", activa: "Activa", retirada: "Cerrada" } as const;

export default async function ClasesPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/clases");
  const clases = await clasesDelEstudiante(getDb(), userId);

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> git clone clase"}</p>
        <h1 className="text-3xl font-black">Tus clases</h1>
        <p className="leading-7 text-muted-foreground">Si tu docente te dio un código, escríbelo aquí. Tus preguntas sobre los casos de la clase le llegarán a tu docente.</p>
      </header>
      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Unirme a una clase</h2>
        <FormularioUnirse />
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Mis clases</h2>
        {clases.length === 0 ? (
          <p className="text-muted-foreground">Todavía no estás en ninguna clase.</p>
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
                        <Link className="font-bold text-primary hover:underline" href={`/casos/${caso.slug}`}>{caso.titulo}</Link>
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
