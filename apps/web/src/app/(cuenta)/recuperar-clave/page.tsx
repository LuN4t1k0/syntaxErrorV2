import { Card } from "@syntaxerror/ui/components/card";
import { FormularioRecuperar } from "@/components/cuenta/formulario-recuperar";

export const metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function RecuperarClavePage() {
  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Card className="grid gap-4 p-6">
        <h1 className="text-2xl font-black">Recuperar contraseña</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Escribe el email de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva. Si entras con Google, también te sirve para crear una.
        </p>
        <FormularioRecuperar />
      </Card>
    </main>
  );
}
