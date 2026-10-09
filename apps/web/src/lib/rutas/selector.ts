import type { Caso } from "@syntaxerror/content/tipos";
import type { RutaConEstado } from "@syntaxerror/content/publicacion";
import type { RutaSelector } from "@/components/rutas/selector-rutas";

function primerPasoHref(casos: Caso[]): string | null {
  const caso = casos[0];
  const mision = caso?.misiones[0];
  return caso && mision ? `/casos/${caso.slug}/${mision.slug}` : null;
}

// Lo que necesitan el selector y la terminal: sin el contenido de las misiones, que no viaja al navegador.
export function rutasParaSelectorUi(rutas: RutaConEstado[], casos: Caso[]): RutaSelector[] {
  // El número de la filtración cuenta solo las filtradas, que ve todo el mundo: así es el mismo para cada persona.
  const filtradas = rutas.filter((ruta) => ruta.estadoVigente === "filtrada").map((ruta) => ruta.slug);
  return rutas.map((ruta) => {
    const deLaRuta = ruta.casos.flatMap((slug) => casos.filter((caso) => caso.slug === slug));
    return {
      slug: ruta.slug,
      titulo: ruta.titulo,
      cargo: ruta.cargo,
      descripcion: ruta.descripcion,
      teaser: ruta.teaser ?? null,
      estadoVigente: ruta.estadoVigente,
      casos: ruta.casos,
      totalCasos: deLaRuta.filter((caso) => caso.tipo === "caso").length,
      totalClases: deLaRuta.filter((caso) => caso.tipo === "clases").length,
      primerPaso: deLaRuta[0]?.titulo ?? null,
      primerPasoHref: primerPasoHref(deLaRuta),
      leak: `LEAK_0x${(0x11 + Math.max(0, filtradas.indexOf(ruta.slug))).toString(16).toUpperCase()}`,
    };
  });
}
