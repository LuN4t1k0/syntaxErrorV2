import { DIMENSIONES, NIVELES, NOMBRES_DIMENSION, type Puntaje } from "@syntaxerror/content/rubrica";
import type { RevisionEntregable } from "@/lib/progreso/servicio";

// El puntaje de cada dimensión con su comentario. Un entregable revisado antes de la rúbrica con puntaje no tiene
// puntajes: entonces solo se muestra el comentario general.
export function ResultadoRevision({ revision }: { revision: RevisionEntregable }) {
  const conPuntaje = DIMENSIONES.filter((dimension) => revision.puntajes[dimension] !== undefined);
  return (
    <div className="grid gap-2">
      {conPuntaje.length > 0 ? (
        <dl className="grid gap-2">
          {conPuntaje.map((dimension) => {
            const puntaje = revision.puntajes[dimension] as Puntaje;
            return (
              <div key={dimension} className="grid gap-0.5">
                <dt className="font-bold">{`${NOMBRES_DIMENSION[dimension]}: ${puntaje} · ${NIVELES[puntaje].nombre}`}</dt>
                {revision.observaciones[dimension] ? <dd className="whitespace-pre-wrap">{revision.observaciones[dimension]}</dd> : null}
              </div>
            );
          })}
        </dl>
      ) : null}
      {revision.comentario ? <p className="whitespace-pre-wrap">{`Comentario general: ${revision.comentario}`}</p> : null}
    </div>
  );
}
