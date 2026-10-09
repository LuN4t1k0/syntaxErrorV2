import Link from "next/link";
import type { FilaPregunta } from "@/lib/preguntas-profesor";
import { FormularioRespuesta } from "./formulario-respuesta";

const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

export function ListaPreguntas({ preguntas, modo }: { preguntas: FilaPregunta[]; modo: "estudiante" | "docente" }) {
  return (
    <ul className="grid gap-3">
      {preguntas.map((pregunta) => (
        <li key={pregunta.id} className={pregunta.estado === "pendiente" ? "card grid gap-3 border-primary p-4" : "card grid gap-3 p-4"}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link className="font-bold text-accent hover:underline" href={`/casos/${pregunta.caso.slug}/${pregunta.mision.slug}`}>
              {`${pregunta.caso.titulo} · ${pregunta.mision.titulo}`}
            </Link>
            <span className="badge">{pregunta.estado === "pendiente" ? "Pendiente" : "Respondida"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {modo === "docente" ? `${pregunta.estudiante} · ` : ""}
            {fecha(pregunta.creadaEn)}
            {modo === "docente" && !pregunta.asignada ? " · sin docente asignado" : ""}
          </p>
          <p className="whitespace-pre-wrap leading-7">{pregunta.texto}</p>
          {pregunta.respuesta ? (
            <div className="grid gap-1 rounded-md border border-primary/30 p-3">
              <p className="text-xs font-bold text-accent">Respuesta</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{pregunta.respuesta}</p>
            </div>
          ) : modo === "docente" ? (
            <FormularioRespuesta preguntaId={pregunta.id} />
          ) : (
            <p className="text-sm text-muted-foreground">Todavía sin respuesta. Te avisaremos por email.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
