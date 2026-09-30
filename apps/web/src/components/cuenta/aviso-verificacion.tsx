"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function AvisoVerificacion() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function reenviar() {
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/reenviar-verificacion", "POST");
    setEnviando(false);
    if (respuesta.ok) setMensaje("Te enviamos un enlace nuevo. Revisa tu correo.");
    else if (respuesta.status === 429) setMensaje("Ya te enviamos varios enlaces. Espera un rato antes de pedir otro.");
    else setMensaje("No pudimos enviar el email. Intenta de nuevo en unos minutos.");
  }

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm">
      <p className="flex-1 font-bold">
        Confirma tu email: así te llegan tus certificados y los avisos de tu cuenta. Te enviamos un enlace al registrarte.
      </p>
      <Button type="button" size="sm" variant="secondary" onClick={() => void reenviar()} disabled={enviando}>
        Reenviar email
      </Button>
      {mensaje ? (
        <p role="status" className="w-full">
          {mensaje}
        </p>
      ) : null}
    </section>
  );
}
