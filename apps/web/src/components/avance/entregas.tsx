import Link from "next/link";
import { DIMENSIONES, NOMBRES_DIMENSION, type Dimension } from "@syntaxerror/content/rubrica";
import { cn } from "@syntaxerror/ui/cn";
import type { EntregaAvance } from "@/lib/avance/datos";
import { SeccionTerminal } from "./terminal";

const ESTADO: Record<EntregaAvance["estado"], { texto: string; color: string }> = {
  pendiente: { texto: "en revisión", color: "text-primary" },
  aprobado: { texto: "aprobada", color: "text-emerald-600 dark:text-emerald-400" },
  observado: { texto: "con observaciones", color: "text-red-600 dark:text-red-400" },
};

function esDimension(valor: string): valor is Dimension {
  return (DIMENSIONES as readonly string[]).includes(valor);
}

// El admin va a la revisión; el alumno, al caso, donde ve las observaciones y vuelve a enviar.
export function ListaEntregas({ entregas, modo, email }: { entregas: EntregaAvance[]; modo: "admin" | "alumno"; email: string }) {
  if (entregas.length === 0) return null;
  return (
    <SeccionTerminal comando="git log --entregas" etiqueta="Entregas">
      <ul className="grid gap-3">
        {entregas.map((entrega) => (
          <li key={entrega.caso.slug} className="grid gap-1">
            <p className="flex flex-wrap gap-x-3">
              <Link href={modo === "admin" ? `/profesor/entregables?q=${encodeURIComponent(email)}` : `/casos/${entrega.caso.slug}`} className="font-bold hover:underline">{entrega.caso.titulo}</Link>
              <span className={cn(ESTADO[entrega.estado].color)}>{ESTADO[entrega.estado].texto}</span>
            </p>
            {entrega.estado !== "pendiente" ? (
              <ul className="grid gap-0.5 pl-4 text-muted-foreground">
                {Object.keys(entrega.puntajes).filter(esDimension).map((dimension) => (
                  <li key={dimension}>{`${NOMBRES_DIMENSION[dimension]}: ${entrega.puntajes[dimension]}/3${entrega.observaciones[dimension] ? ` · ${entrega.observaciones[dimension]}` : ""}`}</li>
                ))}
                {entrega.comentario ? <li>{`Comentario: ${entrega.comentario}`}</li> : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </SeccionTerminal>
  );
}
