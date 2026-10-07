import { getDb } from "@syntaxerror/db/client";
import { SelectorRutas } from "@/components/rutas/selector-rutas";
import { accesoBeta } from "@/lib/beta";
import { casosParaConstruir } from "@/lib/contenido";
import { rutasParaSelector } from "@/lib/rutas/estado";
import { rutasParaSelectorUi } from "@/lib/rutas/selector";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rutas" };

export default async function RutasPage() {
  const userId = await obtenerUsuarioId();
  const puedeBeta = userId ? await accesoBeta(getDb(), userId) : false;
  const [rutas, casos] = await Promise.all([rutasParaSelector(puedeBeta), casosParaConstruir()]);
  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> ls rutas/"}</p>
      <h1 className="text-3xl font-black">Rutas</h1>
      <SelectorRutas rutas={rutasParaSelectorUi(rutas, casos)} sesion={Boolean(userId)} accion="Empezar" />
    </main>
  );
}
