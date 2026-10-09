"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { Feedback } from "@syntaxerror/ui/components/feedback";
import { enviarJson } from "@/lib/cuenta/cliente";

const MENSAJES_ESTADO: Record<string, (clase: string) => string> = {
  pendiente: (clase) =>
    `Tu solicitud para entrar a «${clase}» quedó enviada. Espera que tu docente la acepte.`,
  activa: (clase) => `Ya eres parte de «${clase}».`,
  retirada: (clase) => `Tu docente cerró tu inscripción en «${clase}».`,
};

export function FormularioUnirse() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  async function unirse(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/clases/unirse", "POST", {
      codigo,
    });
    setEnviando(false);
    const { estado, clase } = respuesta.datos as {
      estado?: string;
      clase?: string;
    };
    if (respuesta.ok && estado && clase) {
      setFallo(false);
      setAviso(MENSAJES_ESTADO[estado]?.(clase) ?? null);
      setCodigo("");
      router.refresh();
    } else {
      setFallo(true);
      if (respuesta.status === 404)
        setAviso("No encontramos una clase con ese código.");
      else if (respuesta.error === "es_tu_clase")
        setAviso("Esa clase es tuya: comparte el código con tus estudiantes.");
      else if (respuesta.status === 429)
        setAviso("Probaste muchos códigos seguidos. Espera unos minutos.");
      else setAviso("No pudimos unirte a la clase. Intenta de nuevo.");
    }
  }

  return (
    <form className="grid gap-3" onSubmit={unirse}>
      <Label>
        Código de la clase
        <Input
          name="codigo"
          value={codigo}
          onChange={(evento) => setCodigo(evento.target.value)}
          required
          maxLength={20}
          autoComplete="off"
          className="font-mono uppercase"
        />
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>
          Unirme
        </Button>
      </div>
      {aviso ? (
        <Feedback tipo={fallo ? "error" : "success"}>{aviso}</Feedback>
      ) : null}
    </form>
  );
}
