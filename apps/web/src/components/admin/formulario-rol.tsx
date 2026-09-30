"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { ETIQUETAS_ROL } from "@/lib/admin/etiquetas";
import { enviarJson } from "@/lib/cuenta/cliente";
import type { Rol } from "@/lib/roles";

const OPCIONES: Rol[] = ["student", "teacher", "admin"];

export function FormularioRol({ userId, rolActual }: { userId: string; rolActual: Rol }) {
  const router = useRouter();
  const [rol, setRol] = useState<Rol>(rolActual);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson(`/api/admin/usuarios/${userId}`, "PATCH", { rol });
    setEnviando(false);
    setAviso(respuesta.ok ? "Rol actualizado." : "No se pudo cambiar el rol.");
    if (respuesta.ok) router.refresh();
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={guardar}>
      <label className="grid gap-1 text-sm font-bold">
        Rol
        <select value={rol} onChange={(evento) => setRol(evento.target.value as Rol)} className="h-10 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground">
          {OPCIONES.map((opcion) => <option key={opcion} value={opcion}>{ETIQUETAS_ROL[opcion]}</option>)}
        </select>
      </label>
      <Button type="submit" disabled={enviando || rol === rolActual}>Guardar rol</Button>
      {aviso ? <p role="status" className="w-full text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
