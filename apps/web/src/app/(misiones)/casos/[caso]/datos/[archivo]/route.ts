import { casosParaConstruir, obtenerCaso } from "@/lib/contenido";

// Los CSV de cada caso, para trabajar fuera de la plataforma: la planilla del entregable, el notebook en Colab o
// el dashboard en Power BI o Looker Studio. Se generan en el build, como las páginas del caso.
export const dynamic = "force-static";
export const dynamicParams = false;

type Parametros = { params: Promise<{ caso: string; archivo: string }> };

export async function generateStaticParams() {
  return (await casosParaConstruir()).flatMap((caso) => caso.datos.map((tabla) => ({ caso: caso.slug, archivo: `${tabla.nombre}.csv` })));
}

export async function GET(_request: Request, { params }: Parametros) {
  const { caso: slug, archivo } = await params;
  const caso = await obtenerCaso(slug);
  const tabla = caso?.datos.find((candidata) => `${candidata.nombre}.csv` === archivo);
  if (!caso || !tabla) return new Response("No encontramos ese archivo.", { status: 404 });
  return new Response(tabla.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${caso.slug}-${archivo}"`,
    },
  });
}
