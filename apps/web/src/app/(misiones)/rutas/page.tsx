import Link from "next/link";
import { rutasParaPublicar } from "@/lib/contenido";

export const metadata = { title: "Rutas" };

export default async function RutasPage() {
  const rutas = await rutasParaPublicar();
  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> ls rutas/"}</p>
      <h1 className="text-3xl font-black">Rutas</h1>
      {rutas.length === 0 ? <p className="text-muted-foreground">Estamos terminando la primera ruta. Vuelve pronto.</p> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rutas.map((ruta) => (
            <li key={ruta.slug}>
              <Link href={`/rutas/${ruta.slug}`} className="card grid gap-2 p-5 hover:border-primary">
                <span className="font-mono text-xs text-muted-foreground">{ruta.cargo}</span>
                <span className="text-xl font-black">{ruta.titulo}</span>
                <span className="text-sm leading-6 text-muted-foreground">{ruta.descripcion}</span>
                {ruta.estado === "borrador" ? <span className="badge w-fit">Borrador</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
