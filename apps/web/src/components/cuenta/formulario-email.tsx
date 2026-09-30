"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  mismo_email: "Ese ya es tu email.",
  email_en_uso: "Ese email ya lo usa otra cuenta.",
  clave_incorrecta: "La contraseña actual no es correcta.",
  rate_limited: "Hiciste muchos intentos. Espera un rato antes de volver a intentar.",
  cola_no_disponible: "No pudimos enviar el email de confirmación. Intenta de nuevo en unos minutos.",
  invalido: "Revisa que el email esté bien escrito.",
};

export function FormularioEmail({ tieneClave }: { tieneClave: boolean }) {
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [claveActual, setClaveActual] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson(
      "/api/cuenta/email",
      "POST",
      tieneClave ? { nuevoEmail, claveActual } : { nuevoEmail }
    );
    setEnviando(false);
    setMensaje(
      respuesta.ok
        ? `Te enviamos un enlace a ${nuevoEmail.trim()}. Ábrelo para confirmar el cambio.`
        : ((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos pedir el cambio. Intenta de nuevo.")
    );
    if (respuesta.ok) setClaveActual("");
  }

  return (
    <form className="grid gap-3" onSubmit={pedir}>
      <Label>
        Nuevo email
        <Input
          type="email"
          value={nuevoEmail}
          onChange={(evento) => setNuevoEmail(evento.target.value)}
          required
          autoComplete="email"
        />
      </Label>
      {tieneClave ? (
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
      ) : null}
      <div>
        <Button type="submit" disabled={enviando}>
          Enviar confirmación
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
