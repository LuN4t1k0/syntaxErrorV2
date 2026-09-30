"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  usuario_invalido: "Usa entre 3 y 30 letras minúsculas, números o guiones, sin empezar ni terminar en guion.",
  usuario_en_uso: "Ese usuario ya está tomado. Prueba con otro.",
  usuario_requerido: "Elige un usuario para publicar tu portafolio.",
};

export function FormularioPortafolio({
  publicoActual,
  usuarioActual,
  sugerido,
  urlBase,
}: {
  publicoActual: boolean;
  usuarioActual: string | null;
  sugerido: string;
  urlBase: string;
}) {
  const [publico, setPublico] = useState(publicoActual);
  const [usuario, setUsuario] = useState(usuarioActual ?? sugerido);
  const [guardado, setGuardado] = useState<{ publico: boolean; usuario: string | null }>({
    publico: publicoActual,
    usuario: usuarioActual,
  });
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/portafolio", "PATCH", { publico, usuario });
    setEnviando(false);
    if (respuesta.ok) {
      const usuarioGuardado = typeof respuesta.datos.usuario === "string" ? respuesta.datos.usuario : null;
      setGuardado({ publico, usuario: usuarioGuardado });
      setUsuario(usuarioGuardado ?? usuario);
      setMensaje("Portafolio guardado.");
      return;
    }
    setMensaje((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos guardar tu portafolio. Intenta de nuevo.");
  }

  const usuarioVisible = usuario.trim().toLowerCase() || "tu-usuario";

  return (
    <form className="grid gap-3" onSubmit={guardar}>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" className="size-4" checked={publico} onChange={(evento) => setPublico(evento.target.checked)} />
        Hacer público mi portafolio
      </label>
      <Label>
        Tu usuario
        <Input value={usuario} onChange={(evento) => setUsuario(evento.target.value)} maxLength={30} autoComplete="off" />
      </Label>
      <p className="text-sm text-muted-foreground">
        Tu portafolio queda en <span className="font-mono">{`${urlBase}${usuarioVisible}`}</span>
      </p>
      <div>
        <Button type="submit" disabled={enviando}>
          Guardar portafolio
        </Button>
      </div>
      {mensaje ? (
        <p role="status" className="text-sm font-bold">
          {mensaje}
        </p>
      ) : null}
      {guardado.publico && guardado.usuario ? (
        <Link className="w-fit text-sm font-bold text-primary hover:underline" href={`/p/${guardado.usuario}`}>
          Ver mi portafolio
        </Link>
      ) : null}
    </form>
  );
}
