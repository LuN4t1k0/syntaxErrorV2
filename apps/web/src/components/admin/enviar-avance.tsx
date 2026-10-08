"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

const MENSAJES: Record<number, string> = {
  429: "Ya enviaste el avance hace menos de 10 minutos.",
  503: "El servicio de emails no responde. Intenta de nuevo en unos minutos.",
};

// Le envía a la persona su avance por email, con una nota opcional que va arriba del resumen.
export function EnviarAvance({ userId, maximo, ultimo, verificado }: { userId: string; maximo: number; ultimo: string | null; verificado: boolean }) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson(`/api/admin/usuarios/${userId}/avance`, "POST", nota.trim() ? { nota } : {});
    setEnviando(false);
    setAviso(respuesta.ok ? "Avance enviado." : MENSAJES[respuesta.status] ?? "No se pudo enviar.");
    if (respuesta.ok) {
      setNota("");
      router.refresh();
    }
  }

  return (
    <form className="grid gap-3" onSubmit={enviar}>
      {!verificado ? <p className="text-sm text-muted-foreground">Esta persona no confirmó su email: puede que no lo reciba.</p> : null}
      <label className="grid gap-1 text-sm font-bold">
        Nota (opcional)
        <textarea value={nota} onChange={(evento) => setNota(evento.target.value)} maxLength={maximo} rows={3} placeholder="Vi que te quedaste en BUSCARV: prueba la pista 2." className="field font-normal" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={enviando}>Enviar avance</Button>
        <span className="text-sm text-muted-foreground">{ultimo ?? "Nunca se le envió el avance."}</span>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
