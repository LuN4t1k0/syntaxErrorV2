import { cn } from "@syntaxerror/ui/cn";
import type { Mensaje } from "./use-conversacion";

// Las preguntas y respuestas de una conversación con la IA (tutor o asistente).
export function Conversacion({ mensajes, pensando, desdeCache }: { mensajes: Mensaje[]; pensando: string; desdeCache: string }) {
  if (mensajes.length === 0) return null;
  return (
    <ol className="grid gap-3">
      {mensajes.map((mensaje) => (
        <li key={mensaje.id} className="grid gap-2">
          <p className="justify-self-end rounded-md bg-surface-raised px-3 py-2 text-sm font-bold">{mensaje.pregunta}</p>
          {mensaje.estado === "pendiente" ? (
            <p role="status" className="text-sm text-muted-foreground">
              {pensando}
            </p>
          ) : (
            <div className="grid gap-1">
              <p
                className={cn(
                  "whitespace-pre-wrap rounded-md border p-3 text-sm leading-6",
                  mensaje.estado === "error" || mensaje.estado === "fuera_de_tema" ? "border-destructive/30" : "border-primary/30"
                )}
              >
                {mensaje.respuesta}
              </p>
              {mensaje.estado === "desde_cache" ? <p className="text-xs text-muted-foreground">{desdeCache}</p> : null}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
