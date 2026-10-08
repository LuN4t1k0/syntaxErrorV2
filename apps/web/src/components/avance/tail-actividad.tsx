import Link from "next/link";
import type { EventoAvance } from "@/lib/avance/datos";
import { haceCuanto } from "@/lib/avance/trabas";
import { SeccionTerminal } from "./terminal";

const ETIQUETA: Record<EventoAvance["tipo"], string> = { leccion: "ok", entrega: "push", tutor: "ask", docente: "ask", puntos: "xp" };

export function TailActividad({ eventos, ahora }: { eventos: EventoAvance[]; ahora: Date }) {
  return (
    <SeccionTerminal comando="tail -n 20 actividad.log" etiqueta="Actividad reciente">
      {eventos.length === 0 ? (
        <p className="text-muted-foreground">Sin actividad todavía.</p>
      ) : (
        <ol className="grid gap-1">
          {eventos.map((evento, indice) => (
            <li key={indice} className="flex flex-wrap gap-x-3">
              <span className="w-20 shrink-0 text-muted-foreground">{haceCuanto(evento.fecha, ahora)}</span>
              <span className="w-10 shrink-0 font-bold text-primary">{ETIQUETA[evento.tipo]}</span>
              {evento.href ? <Link href={evento.href} className="hover:underline">{evento.texto}</Link> : <span>{evento.texto}</span>}
            </li>
          ))}
        </ol>
      )}
    </SeccionTerminal>
  );
}
