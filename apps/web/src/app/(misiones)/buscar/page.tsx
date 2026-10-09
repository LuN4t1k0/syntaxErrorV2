import { Suspense } from "react";
import { Buscador } from "@/components/buscador";
import { construirIndice } from "@/lib/buscador/indice";
import { casosParaPublicar, rutasParaPublicar } from "@/lib/contenido";

export const dynamic = "error";
export const metadata = { title: "Buscar", description: "Busca rutas, casos y misiones de syntaxError.cl." };

export default async function BuscarPage() {
  const indice = construirIndice(await rutasParaPublicar(), await casosParaPublicar());
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-accent">{"> grep -ri"}</p>
      <h1 className="text-3xl font-black">Buscar</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando el buscador...</p>}>
        <Buscador indice={indice} />
      </Suspense>
    </main>
  );
}
