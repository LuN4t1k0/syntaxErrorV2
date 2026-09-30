import Link from "next/link";

export default function CertificadoNoEncontrado() {
  return (
    <main className="mx-auto grid max-w-2xl gap-4 px-4 py-16 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> verify"}</p>
      <h1 className="text-3xl font-black">Código no encontrado</h1>
      <p className="text-muted-foreground">No encontramos un certificado vigente o migrado con ese código.</p>
      <Link className="w-fit font-bold text-primary hover:underline" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
