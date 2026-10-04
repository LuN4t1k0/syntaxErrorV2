import { Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { buttonVariants } from "@syntaxerror/ui/components/button";
import { BotonImprimir } from "@/components/certificados/boton-imprimir";
import { descripcionCertificado, fechaCertificado } from "@/lib/certificados/formato";
import { buscarCertificado } from "@/lib/certificados/servicio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificado" };

type Parametros = { params: Promise<{ codigo: string }> };

export default async function CertificadoPage({ params }: Parametros) {
  const { codigo } = await params;
  const certificado = await buscarCertificado(getDb(), codigo);
  if (!certificado) notFound();

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground print:bg-white print:px-0 print:py-0">
      <div className="mx-auto grid max-w-5xl gap-4 print:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link className="font-bold text-primary hover:underline" href={`/verificar/${certificado.codigo}`}>
            Verificar autenticidad
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <a className={buttonVariants({ variant: "primary" })} href={`/certificados/${certificado.codigo}/pdf`} download>
              <Download className="size-4" aria-hidden="true" />
              Descargar PDF
            </a>
            <BotonImprimir />
          </div>
        </div>
        <section className="grid min-h-[720px] place-items-center border border-border bg-surface p-8 text-center print:min-h-screen print:border-0 print:bg-white">
          <div className="grid max-w-3xl gap-8">
            <div className="grid gap-2">
              <p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-primary">syntaxError.cl</p>
              <h1 className="text-4xl font-black sm:text-6xl">Certificado</h1>
              <p className="text-lg text-muted-foreground">{descripcionCertificado(certificado)}</p>
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-bold uppercase text-muted-foreground">Otorgado a</p>
              <p className="text-3xl font-black sm:text-5xl">{certificado.nombreAlumno}</p>
            </div>
            <div className="grid gap-2">
              <p className="text-muted-foreground">Por completar</p>
              <p className="text-2xl font-black">{certificado.titulo}</p>
              {certificado.cargo ? <p className="text-muted-foreground">{certificado.cargo}</p> : null}
            </div>
            <div className="mx-auto grid max-w-xl gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
              <p>Emitido el {fechaCertificado(certificado.emitidoEn)}</p>
              <p>Código de verificación: <span className="font-mono font-bold text-foreground">{certificado.codigo}</span></p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
