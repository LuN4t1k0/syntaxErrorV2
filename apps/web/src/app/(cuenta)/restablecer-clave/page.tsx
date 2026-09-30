import { Suspense } from "react";
import { Card } from "@syntaxerror/ui/components/card";
import { FormularioRestablecer } from "@/components/cuenta/formulario-restablecer";

export const metadata = { title: "Elige una contraseña nueva", robots: { index: false } };

export default function RestablecerClavePage() {
  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Card className="grid gap-4 p-6">
        <h1 className="text-2xl font-black">Elige una contraseña nueva</h1>
        <Suspense fallback={null}>
          <FormularioRestablecer />
        </Suspense>
      </Card>
    </main>
  );
}
