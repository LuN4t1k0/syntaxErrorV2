"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { Feedback } from "@syntaxerror/ui/components/feedback";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  clave_incorrecta: "La contraseña actual no es correcta.",
  invalido: "La contraseña nueva debe tener al menos 8 caracteres.",
  rate_limited:
    "Hiciste muchos intentos. Espera un rato antes de volver a intentar.",
};

export function FormularioClave() {
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cambiar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/clave", "POST", {
      claveActual,
      claveNueva,
    });
    setEnviando(false);
    setMensaje(
      respuesta.ok
        ? "Tu contraseña cambió."
        : ((respuesta.error && ERRORES[respuesta.error]) ??
            "No pudimos cambiar la contraseña."),
    );
    setFallo(!respuesta.ok);
    if (respuesta.ok) {
      setClaveActual("");
      setClaveNueva("");
    }
  }

  return (
    <form className="grid gap-3" onSubmit={cambiar}>
      <Label>
        Contraseña actual
        <Input
          type="password"
          value={claveActual}
          onChange={(evento) => setClaveActual(evento.target.value)}
          required
          autoComplete="current-password"
        />
      </Label>
      <Label>
        Contraseña nueva
        <Input
          type="password"
          value={claveNueva}
          onChange={(evento) => setClaveNueva(evento.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>
          Cambiar contraseña
        </Button>
      </div>
      {mensaje ? (
        <Feedback tipo={fallo ? "error" : "success"}>{mensaje}</Feedback>
      ) : null}
    </form>
  );
}
