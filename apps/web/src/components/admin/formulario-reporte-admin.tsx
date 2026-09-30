"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioReporteAdmin({ reporteId, esError }: { reporteId: string; esError: boolean }) {
  const router = useRouter();
  const [asunto, setAsunto] = useState("Sobre tu reporte");
  const [cuerpo, setCuerpo] = useState("");
  const [util, setUtil] = useState(esError);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function resolver(conRespuesta: boolean) {
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson(`/api/admin/reportes/${reporteId}`, "POST", { util, respuesta: conRespuesta ? { asunto, cuerpo } : null });
    setEnviando(false);
    if (respuesta.ok) router.refresh();
    else setAviso(respuesta.status === 404 ? "Este reporte ya fue resuelto." : "No se pudo resolver el reporte.");
  }

  function responder(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void resolver(true);
  }

  return (
    <form className="grid gap-3" onSubmit={responder}>
      {esError ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={util} onChange={(evento) => setUtil(evento.target.checked)} />Fue un error real (suma 25 puntos)</label> : null}
      <label className="grid gap-1 text-sm font-bold">Asunto<input value={asunto} onChange={(evento) => setAsunto(evento.target.value)} maxLength={150} className="h-10 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground" /></label>
      <label className="grid gap-1 text-sm font-bold">Respuesta<textarea value={cuerpo} onChange={(evento) => setCuerpo(evento.target.value)} rows={3} maxLength={4000} className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary" /></label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={enviando}>Responder y resolver</Button>
        <Button type="button" size="sm" variant="ghost" disabled={enviando} onClick={() => void resolver(false)}>Resolver sin responder</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
