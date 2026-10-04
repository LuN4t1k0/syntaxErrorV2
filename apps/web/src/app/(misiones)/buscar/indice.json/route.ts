import { construirIndice } from "@/lib/buscador/indice";
import { casosParaPublicar, rutasParaPublicar } from "@/lib/contenido";

// El índice que descarga la búsqueda rápida (Ctrl+K) la primera vez que se abre. Se genera al construir la app.
export const dynamic = "force-static";

export async function GET() {
  return Response.json(construirIndice(await rutasParaPublicar(), await casosParaPublicar()));
}
