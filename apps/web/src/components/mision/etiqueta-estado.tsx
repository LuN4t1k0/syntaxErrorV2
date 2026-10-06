import { Check, Circle, CircleDot, Lock, type LucideIcon } from "lucide-react";
import type { EstadoVisibleMision } from "@/lib/progreso/estados";

const ESTADOS: Record<EstadoVisibleMision, { texto: string; clase: string; Icono: LucideIcon }> = {
  pendiente: { texto: "Pendiente", clase: "border-border bg-surface-raised text-muted-foreground", Icono: Circle },
  en_curso: { texto: "En curso", clase: "border-primary bg-primary/10 text-primary", Icono: CircleDot },
  aprobada: { texto: "Aprobada", clase: "border-success bg-success/15 text-foreground", Icono: Check },
  bloqueada: { texto: "Bloqueada", clase: "border-border bg-background text-muted-foreground", Icono: Lock },
};

export function EtiquetaEstado({ estado, testId }: { estado: EstadoVisibleMision; testId?: string }) {
  const { texto, clase, Icono } = ESTADOS[estado];
  return (
    <span data-testid={testId} className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 font-mono text-xs font-black ${clase}`}>
      <Icono aria-hidden="true" size={13} strokeWidth={2.5} />
      {texto}
    </span>
  );
}
