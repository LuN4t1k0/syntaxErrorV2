import Link from "next/link";
import { AccesoCard } from "@/components/cuenta/acceso-card";
import { FormularioRecuperar } from "@/components/cuenta/formulario-recuperar";

export const metadata = {
  title: "Recuperar contraseña",
  robots: { index: false },
};

export default function RecuperarClavePage() {
  return (
    <main className="mx-auto grid w-full max-w-lg justify-items-center px-4 py-16">
      <AccesoCard
        marca={false}
        etiqueta="Volvamos a tu cuenta"
        titulo="Recuperar contraseña"
        descripcion="Escribe el email de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva. Si entras con Google, también te sirve para crear una."
      >
        <FormularioRecuperar />
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-bold text-accent hover:underline"
        >
          Volver a entrar
        </Link>
      </AccesoCard>
    </main>
  );
}
