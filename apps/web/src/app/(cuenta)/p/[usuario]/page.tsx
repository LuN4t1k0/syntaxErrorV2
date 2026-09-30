import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { fechaCertificado } from "@/lib/certificados/formato";
import { obtenerPortafolio } from "@/lib/portafolio";

export const dynamic = "force-dynamic";

type Parametros = { params: Promise<{ usuario: string }> };

export async function generateMetadata({ params }: Parametros) {
  const { usuario } = await params;
  return { title: `Portafolio de ${usuario}` };
}

export default async function PortafolioPage({ params }: Parametros) {
  const { usuario } = await params;
  const portafolio = await obtenerPortafolio(getDb(), usuario);
  if (!portafolio) notFound();

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:px-8">
      <section className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`/p/${portafolio.usuario}`}</p>
        <h1 className="text-4xl font-black">{portafolio.nombre}</h1>
        <p className="max-w-2xl leading-7 text-muted-foreground">
          Casos completados y certificados verificables en syntaxError.cl.
        </p>
      </section>

      <section className="grid gap-4">
        <h2 className="text-2xl font-black">Casos completados</h2>
        {portafolio.casos.length === 0 ? (
          <p className="text-muted-foreground">Este portafolio aún no tiene casos publicados.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {portafolio.casos.map((caso) => (
              <li key={caso.slug} className="card grid gap-3 p-5">
                <div>
                  <p className="font-bold">{caso.titulo}</p>
                  <p className="text-sm text-muted-foreground">{caso.empresa} · {caso.cargo}</p>
                </div>
                {caso.entregable ? (
                  <Link className="text-sm font-bold text-primary hover:underline" href={caso.entregable}>
                    Ver entregable
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="text-2xl font-black">Certificados</h2>
        {portafolio.certificados.length === 0 ? (
          <p className="text-muted-foreground">Todavía no hay certificados visibles.</p>
        ) : (
          <ul className="grid gap-3">
            {portafolio.certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link href={`/verificar/${certificado.codigo}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                  <span>
                    <span className="block font-bold">{certificado.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{fechaCertificado(certificado.emitidoEn)}</span>
                  </span>
                  <span className="badge">{certificado.tipo === "ruta" ? "Ruta" : certificado.tipo === "curso" ? "Curso" : "Caso"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
