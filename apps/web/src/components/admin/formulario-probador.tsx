"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

// Marca a una persona como probadora: hace las rutas en el orden que quiera, para probarlas antes que el resto.
export function FormularioProbador({ userId, probadorActual }: { userId: string; probadorActual: boolean }) {
  const router = useRouter();
  const [cambio, setCambio] = useState<{ activo: boolean; valor: boolean }>({ activo: false, valor: false });
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const probador = cambio.activo ? cambio.valor : probadorActual;

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson(`/api/admin/usuarios/${userId}`, "PATCH", { probador });
    setEnviando(false);
    setAviso(respuesta.ok ? (probador ? "Ahora es probador." : "Ya no es probador.") : "No se pudo guardar.");
    if (respuesta.ok) router.refresh();
  }

  return (
    <form className="grid gap-3" onSubmit={guardar}>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={probador} onChange={(evento) => setCambio({ activo: true, valor: evento.target.checked })} className="mt-1 size-4 accent-primary" />
        <span>
          <span className="font-bold">Probador</span>
          <span className="block text-muted-foreground">Hace las rutas en el orden que quiera, sin esperar la misión ni el caso anterior. Los certificados se ganan igual: piden los entregables aprobados.</span>
        </span>
      </label>
      <div>
        <Button type="submit" disabled={enviando || probador === probadorActual}>
          Guardar probador
        </Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
