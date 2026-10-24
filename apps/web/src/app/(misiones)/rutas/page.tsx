import { getDb } from "@syntaxerror/db/client";
import { SelectorRutas } from "@/components/rutas/selector-rutas";
import { accesoBeta } from "@/lib/beta";
import { casosParaConstruir } from "@/lib/contenido";
import { rutasParaSelector } from "@/lib/rutas/estado";
import { rutasParaSelectorUi } from "@/lib/rutas/selector";
import { obtenerUsuarioId } from "@/lib/sesion";
import "@/components/panel/panel.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rutas" };

export default async function RutasPage() {
  const userId = await obtenerUsuarioId();
  const puedeBeta = userId ? await accesoBeta(getDb(), userId) : false;
  const [rutas, casos] = await Promise.all([rutasParaSelector(puedeBeta), casosParaConstruir()]);
  return (
    <main className="panel mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <p className="panel-ceja">{"> ls rutas/"}</p>
        <h1 className="panel-titulo-catalogo">Rutas</h1>
        <p className="panel-subtitulo">Elige por dónde empezar. Cada ruta termina con un portafolio y un certificado verificable.</p>
      </header>
      <SelectorRutas rutas={rutasParaSelectorUi(rutas, casos)} sesion={Boolean(userId)} accion="Empezar" />
    </main>
  );
}
