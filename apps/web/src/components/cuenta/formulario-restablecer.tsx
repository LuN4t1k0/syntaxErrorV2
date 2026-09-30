"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  invalido: "El enlace no es válido o ya se usó. Pide uno nuevo.",
  vencido: "El enlace venció (dura una hora). Pide uno nuevo.",
  clave_corta: "La contraseña debe tener al menos 8 caracteres.",
};

export function FormularioRestablecer() {
  const token = useSearchParams().get("token") ?? "";
  const [claveNueva, setClaveNueva] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "listo">("inicial");
  const [error, setError] = useState<string | null>(null);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("enviando");
    setError(null);
    const respuesta = await enviarJson("/api/cuenta/restablecer", "POST", { token, claveNueva });
    if (respuesta.ok) {
      setEstado("listo");
      return;
    }
    setEstado("inicial");
    setError((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos guardar la contraseña. Intenta de nuevo.");
  }

  if (!token) return <p className="text-muted-foreground">El enlace no trae su código. Ábrelo directamente desde el email.</p>;
  if (estado === "listo") {
    return (
      <p role="status" className="leading-7">
        Tu contraseña quedó guardada.{" "}
        <Link className="font-bold text-primary hover:underline" href="/login">
          Entrar
        </Link>
      </p>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={guardar}>
      <Label>
        Contraseña nueva
        <Input type="password" value={claveNueva} onChange={(evento) => setClaveNueva(evento.target.value)} required minLength={8} autoComplete="new-password" />
      </Label>
      <div>
        <Button type="submit" disabled={estado === "enviando"}>
          Guardar contraseña
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}{" "}
          <Link className="underline" href="/recuperar-clave">
            Pedir otro enlace
          </Link>
        </p>
      ) : null}
    </form>
  );
}
