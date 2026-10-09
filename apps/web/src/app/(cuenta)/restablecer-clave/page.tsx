import { Suspense } from "react";
import { AccesoCard } from "@/components/cuenta/acceso-card";
import { FormularioRestablecer } from "@/components/cuenta/formulario-restablecer";

export const metadata = {
  title: "Elige una contraseña nueva",
  robots: { index: false },
};

export default function RestablecerClavePage() {
  return (
    <main className="mx-auto grid w-full max-w-lg justify-items-center px-4 py-16">
      <AccesoCard
        marca={false}
        titulo="Elige una contraseña nueva"
        etiqueta="Recupera tu acceso"
        descripcion="Crea una contraseña para volver a tu cuenta y seguir aprendiendo."
      >
        <Suspense fallback={null}>
          <FormularioRestablecer />
        </Suspense>
      </AccesoCard>
    </main>
  );
}
