import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { auth } from "@/lib/auth";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";

export const metadata = { title: "Tu panel" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  const casosDelUsuario = session?.user?.id ? await listarCasosDelUsuario(getDb(), session.user.id) : [];
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-sm font-bold text-primary">{"> whoami"}</p>
      <h1 className="text-3xl font-black">Hola, {name}</h1>
      <p className="max-w-2xl leading-7 text-muted-foreground">
        Aquí vas a ver tus casos en curso, tus entregables y tus certificados.
      </p>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus casos</h2>
        {casosDelUsuario.length === 0 ? (
          <p className="text-muted-foreground">
            Todavía no empiezas ningún caso.{" "}
            <Link className="font-bold text-primary hover:underline" href="/rutas">
              Mira las rutas
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3">
            {casosDelUsuario.map((caso) => (
              <li key={caso.slug}>
                <Link href={`/casos/${caso.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                  <span className="font-bold">{caso.titulo}</span>
                  <span className="badge">{caso.completo ? "Completo" : `${caso.misionesAprobadas}/${caso.totalMisiones} misiones`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
