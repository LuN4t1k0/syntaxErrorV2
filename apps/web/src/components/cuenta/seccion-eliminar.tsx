"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  clave_incorrecta: "La contraseña no es correcta.",
  confirmacion_incorrecta: "El email no coincide con el de tu cuenta.",
};

export function SeccionEliminar({ tieneClave }: { tieneClave: boolean }) {
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function eliminar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta", "DELETE", { confirmacion });
    if (respuesta.ok) {
      window.location.assign("/");
      return;
    }
    setEnviando(false);
    setMensaje((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos eliminar la cuenta. Intenta de nuevo.");
  }

  return (
    <form className="grid gap-3" onSubmit={eliminar}>
      <Label>
        {tieneClave ? "Escribe tu contraseña para confirmar" : "Escribe tu email para confirmar"}
        <Input
          type={tieneClave ? "password" : "email"}
          value={confirmacion}
          onChange={(evento) => setConfirmacion(evento.target.value)}
          required
          autoComplete="off"
        />
      </Label>
      <div>
        <Button type="submit" variant="destructive" disabled={enviando}>
          Eliminar mi cuenta
        </Button>
      </div>
      {mensaje ? (
        <p role="alert" className="text-sm font-bold text-error-text">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
