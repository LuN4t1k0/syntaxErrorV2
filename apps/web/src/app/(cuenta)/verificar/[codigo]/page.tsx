import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@syntaxerror/ui/components/card";
import { getDb } from "@syntaxerror/db/client";
import {
  descripcionCertificado,
  fechaCertificado,
} from "@/lib/certificados/formato";
import { buscarCertificado } from "@/lib/certificados/servicio";
import { PageIntro } from "@/components/page-intro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verificar certificado" };

type Parametros = { params: Promise<{ codigo: string }> };

export default async function VerificarCertificadoPage({ params }: Parametros) {
  const { codigo } = await params;
  const certificado = await buscarCertificado(getDb(), codigo);
  if (!certificado) notFound();

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-16 sm:px-6 lg:px-8">
      <PageIntro
        comando="> verify"
        titulo="Certificado válido"
        descripcion="Este certificado fue emitido por syntaxError.cl y puedes contrastar sus datos a continuación."
      />
      <Card className="grid gap-4 p-6">
        <span className="badge badge-success">Verificación válida</span>
        <div>
          <p className="text-sm font-bold uppercase text-muted-foreground">
            Alumno
          </p>
          <p className="text-2xl font-black">{certificado.nombreAlumno}</p>
        </div>
        <div>
          <p className="text-sm font-bold uppercase text-muted-foreground">
            Certificación
          </p>
          <p className="font-bold">{certificado.titulo}</p>
          <p className="text-muted-foreground">
            {descripcionCertificado(certificado)}
          </p>
        </div>
        <div className="grid gap-1 text-sm text-muted-foreground">
          <p>Emitido el {fechaCertificado(certificado.emitidoEn)}</p>
          <p>
            Código:{" "}
            <span className="font-mono font-bold text-foreground">
              {certificado.codigo}
            </span>
          </p>
          {certificado.legado ? (
            <p>Certificado migrado desde la plataforma anterior.</p>
          ) : null}
        </div>
      </Card>
      <div>
        <Link
          className="font-bold text-accent hover:underline"
          href={`/certificados/${certificado.codigo}`}
        >
          Abrir certificado imprimible
        </Link>
      </div>
    </main>
  );
}
