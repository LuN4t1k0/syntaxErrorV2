"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { Feedback } from "@syntaxerror/ui/components/feedback";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioNombre({ nombreActual }: { nombreActual: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreActual);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta", "PATCH", { nombre });
    setEnviando(false);
    setMensaje(
      respuesta.ok
        ? "Nombre actualizado."
        : "No pudimos guardar el nombre. Revisa que no esté vacío.",
    );
    setFallo(!respuesta.ok);
    if (respuesta.ok) router.refresh();
  }

  return (
    <form className="grid gap-3" onSubmit={guardar}>
      <Label>
        Nombre
        <Input
          name="nombre"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          required
          maxLength={120}
          autoComplete="name"
        />
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>
          Guardar nombre
        </Button>
      </div>
      {mensaje ? (
        <Feedback tipo={fallo ? "error" : "success"}>{mensaje}</Feedback>
      ) : null}
    </form>
  );
}
