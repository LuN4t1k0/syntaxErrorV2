import Link from "next/link";
import { Suspense } from "react";
import { ConfirmarToken } from "@/components/cuenta/confirmar-token";

export const metadata = { title: "Confirma tu email", robots: { index: false } };

export default function VerificarEmailPage() {
  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Suspense fallback={null}>
        <ConfirmarToken
          endpoint="/api/cuenta/verificar-email"
          titulo="Confirma tu email"
          boton="Confirmar email"
          exito={
            <p>
              Tu email quedó confirmado.{" "}
              <Link className="font-bold text-accent hover:underline" href="/dashboard">
                Ir a tu panel
              </Link>
            </p>
          }
          errores={{
            invalido: "El enlace no es válido o ya se usó.",
            vencido: "El enlace venció. Pide uno nuevo desde tu panel.",
          }}
        />
      </Suspense>
    </main>
  );
}
