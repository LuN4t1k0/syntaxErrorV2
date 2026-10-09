import Link from "next/link";
import { Suspense } from "react";
import { ConfirmarToken } from "@/components/cuenta/confirmar-token";

export const metadata = { title: "Confirma tu nuevo email", robots: { index: false } };

export default function ConfirmarEmailPage() {
  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Suspense fallback={null}>
        <ConfirmarToken
          endpoint="/api/cuenta/email/confirmar"
          titulo="Confirma tu nuevo email"
          boton="Confirmar nuevo email"
          exito={
            <p>
              Tu email cambió. Desde ahora entras con el nuevo. Si tenías la sesión abierta, vuelve a{" "}
              <Link className="font-bold text-accent hover:underline" href="/login">
                entrar
              </Link>{" "}
              para verlo en tu cuenta.
            </p>
          }
          errores={{
            invalido: "El enlace no es válido o ya se usó.",
            vencido: "El enlace venció. Pide el cambio de nuevo desde tu perfil.",
            email_en_uso: "Ese email ya lo usa otra cuenta.",
          }}
        />
      </Suspense>
    </main>
  );
}
