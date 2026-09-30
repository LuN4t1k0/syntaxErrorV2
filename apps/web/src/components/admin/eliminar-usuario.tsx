"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

export function EliminarUsuario({ userId }: { userId: string }) {
  const router = useRouter();
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function eliminar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson(`/api/admin/usuarios/${userId}`, "DELETE", { confirmacion });
    setEnviando(false);
    if (respuesta.ok) {
      router.push("/admin/usuarios");
      router.refresh();
      return;
    }
    setAviso(respuesta.error === "confirmacion_incorrecta" ? "El email no coincide con el de la cuenta." : "No se pudo eliminar la cuenta.");
  }

  return (
    <form className="grid gap-3" onSubmit={eliminar}>
      <Label>
        Escribe el email de la cuenta para confirmar
        <Input name="confirmacion" value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} required autoComplete="off" />
      </Label>
      <div><Button type="submit" variant="destructive" disabled={enviando}>Eliminar cuenta</Button></div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
