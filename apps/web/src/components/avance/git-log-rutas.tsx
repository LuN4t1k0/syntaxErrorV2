import Link from "next/link";
import { cn } from "@syntaxerror/ui/cn";
import type { CasoAvance, RutaAvance } from "@/lib/avance/datos";
import { unidad } from "@/lib/unidad";
import { SeccionTerminal } from "./terminal";

const MARCA: Record<CasoAvance["estado"], string> = { completo: "✓", en_curso: "▶", pendiente: "·" };
const COLOR: Record<CasoAvance["estado"], string> = { completo: "text-emerald-600 dark:text-emerald-400", en_curso: "text-accent", pendiente: "text-muted-foreground" };
const ESTADO_LECCION = { aprobada: "aprobada", en_curso: "en curso", sin_empezar: "sin empezar" } as const;

function fecha(valor: Date | null): string {
  return valor ? valor.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santiago" }) : "";
}

// Las lecciones de un caso. El admin ve los intentos y los fallidos; el alumno, solo el estado y la fecha.
function Lecciones({ caso, modo, trabadas }: { caso: CasoAvance; modo: "admin" | "alumno"; trabadas: ReadonlySet<string> }) {
  return (
    <ol className="grid gap-1 border-l border-border pl-4">
      {caso.lecciones.map((leccion, indice) => (
        <li key={leccion.slug} className={cn("flex flex-wrap gap-x-3", trabadas.has(leccion.href) ? "font-bold text-red-600 dark:text-red-400" : leccion.estado === "aprobada" ? "text-emerald-600 dark:text-emerald-400" : leccion.estado === "en_curso" ? "text-accent" : "text-muted-foreground")}>
          <Link href={leccion.href} className="hover:underline">{`${String(indice + 1).padStart(2, "0")} ${leccion.titulo}`}</Link>
          <span>{ESTADO_LECCION[leccion.estado]}</span>
          {modo === "admin" && leccion.intentos > 0 ? <span>{`${leccion.intentos} ${leccion.intentos === 1 ? "intento" : "intentos"} · ${leccion.fallidos} ${leccion.fallidos === 1 ? "fallido" : "fallidos"}`}</span> : null}
          {leccion.actualizadoEn ? <span className="text-muted-foreground">{fecha(leccion.actualizadoEn)}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function Caso({ caso, modo, trabadas }: { caso: CasoAvance; modo: "admin" | "alumno"; trabadas: ReadonlySet<string> }) {
  const resumen = (
    // La marca queda junto al título también en pantallas angostas, donde el título ocupa varias líneas.
    <span className={cn("flex gap-2", COLOR[caso.estado])}>
      <span aria-hidden="true">{MARCA[caso.estado]}</span>
      <span>
        <span className="font-bold">{caso.titulo}</span>{" "}
        <span className="whitespace-nowrap">{`${caso.aprobadas}/${caso.total} ${caso.total === 1 ? unidad(caso.tipo).nombre : caso.tipo === "clases" ? "lecciones" : "misiones"}`}</span>
      </span>
    </span>
  );
  return (
    <li>
      <details open={caso.estado === "en_curso"} className="grid gap-1">
        <summary className="cursor-pointer list-none">{resumen}</summary>
        <div className="mt-1">
          <Lecciones caso={caso} modo={modo} trabadas={trabadas} />
        </div>
      </details>
    </li>
  );
}

export function GitLogRutas({ rutas, otrosCasos, modo, trabadas }: { rutas: RutaAvance[]; otrosCasos: CasoAvance[]; modo: "admin" | "alumno"; trabadas: ReadonlySet<string> }) {
  if (rutas.length === 0 && otrosCasos.length === 0) {
    return (
      <SeccionTerminal comando="git log --ruta">
        <p className="text-muted-foreground">{modo === "admin" ? "Todavía no empieza ninguna ruta." : "Todavía no empiezas ninguna ruta."}</p>
      </SeccionTerminal>
    );
  }
  return (
    <>
      {rutas.map((ruta) => (
        <SeccionTerminal key={ruta.slug} comando={`git log --ruta ${ruta.slug}`} etiqueta={`Ruta ${ruta.titulo}`}>
          <p className="text-muted-foreground">{`${ruta.titulo} · ${ruta.completos} de ${ruta.casos.length} casos completos`}</p>
          <ul className="grid gap-2">
            {ruta.casos.map((caso) => (
              <Caso key={caso.slug} caso={caso} modo={modo} trabadas={trabadas} />
            ))}
          </ul>
        </SeccionTerminal>
      ))}
      {otrosCasos.length > 0 ? (
        <SeccionTerminal comando="git log --otros-casos" etiqueta="Otros casos">
          <ul className="grid gap-2">
            {otrosCasos.map((caso) => (
              <Caso key={caso.slug} caso={caso} modo={modo} trabadas={trabadas} />
            ))}
          </ul>
        </SeccionTerminal>
      ) : null}
    </>
  );
}
