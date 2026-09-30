"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioRecuperar() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/recuperar", "POST", { email });
    setEnviando(false);
    if (respuesta.status === 429) setMensaje("Hiciste muchos intentos. Espera un rato antes de volver a pedir el enlace.");
    else if (!respuesta.ok) setMensaje("Revisa que el email esté bien escrito.");
    else setMensaje("Si hay una cuenta con ese email, te enviamos un enlace para elegir una contraseña nueva. Revisa tu correo.");
  }

  return (
    <form className="grid gap-4" onSubmit={pedir}>
      <Label>
        Email
        <Input type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} required autoComplete="email" />
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>
          Enviarme el enlace
        </Button>
      </div>
      {mensaje ? (
        <p role="status" className="text-sm font-bold">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
