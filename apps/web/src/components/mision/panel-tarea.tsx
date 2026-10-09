"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Badge } from "@syntaxerror/ui/components/badge";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { INTENTOS_PARA_PISTA, pistasDisponibles } from "@/lib/progreso/ayudas";
import { AvisoBeta } from "./aviso-beta";
import { useMision, type Bloqueo } from "./mision-provider";

function AvisoBloqueo({ bloqueo, caso }: { bloqueo: Bloqueo; caso: string }) {
  const clase =
    "rounded-md border border-border bg-surface-raised p-3 text-sm leading-6";
  if (bloqueo.tipo === "beta")
    return (
      <AvisoBeta
        sesion={bloqueo.sesion}
        volverA={`/casos/${caso}`}
        className={clase}
      />
    );
  if (bloqueo.tipo === "mision") {
    return (
      <p role="status" className={clase}>
        Para resolver esta tarea, primero aprueba la misión{" "}
        <Link
          className="font-bold text-accent hover:underline"
          href={`/casos/${caso}/${bloqueo.mision.slug}`}
        >{`«${bloqueo.mision.titulo}»`}</Link>
        . Puedes leerla igual.
      </p>
    );
  }
  if (!bloqueo.sesion) {
    return (
      <p role="status" className={clase}>
        Para resolver este caso necesitas una cuenta y haber completado{" "}
        <Link
          className="font-bold text-accent hover:underline"
          href={`/casos/${bloqueo.caso.slug}`}
        >{`«${bloqueo.caso.titulo}»`}</Link>
        .{" "}
        <Link
          className="font-bold text-accent hover:underline"
          href={`/login?callbackUrl=${encodeURIComponent(`/casos/${caso}`)}`}
        >
          Entrar
        </Link>
      </p>
    );
  }
  return (
    <p role="status" className={clase}>
      Este caso se habilita al completar{" "}
      <Link
        className="font-bold text-accent hover:underline"
        href={`/casos/${bloqueo.caso.slug}`}
      >{`«${bloqueo.caso.titulo}»`}</Link>
      . Puedes leer la misión igual.
    </p>
  );
}

const TareaDeshabilitada = createContext(false);

// Los controles nativos se desactivan con el fieldset; el editor de código lo lee de aquí.
export function useTareaDeshabilitada(): boolean {
  return useContext(TareaDeshabilitada);
}

export function PanelTarea({
  id,
  titulo,
  enunciado,
  aprobada,
  resultado,
  pistas,
  acciones,
  children,
}: {
  id: string;
  titulo: string;
  enunciado?: string;
  aprobada: boolean;
  resultado: ResultadoTarea | null;
  pistas: string[];
  acciones: ReactNode;
  children: ReactNode;
}) {
  const { caso, listo, bloqueo, fallidosDe } = useMision();
  const [pistasVistas, setPistasVistas] = useState(0);
  const fallidos = fallidosDe(id);
  const disponibles = pistasDisponibles(fallidos, pistas.length);
  const deshabilitada = !listo || bloqueo !== null;
  return (
    <section className="card grid gap-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-accent">{`> ${titulo}`}</p>
        {aprobada ? <Badge className="badge-success">Aprobada</Badge> : null}
      </header>
      {enunciado ? <p className="leading-7">{enunciado}</p> : null}
      {bloqueo ? <AvisoBloqueo bloqueo={bloqueo} caso={caso} /> : null}
      {/* Leer sí, resolver no: con bloqueo (o mientras carga el progreso) los controles quedan desactivados. */}
      <fieldset
        disabled={deshabilitada}
        className="grid min-w-0 gap-4 border-0 p-0"
      >
        <TareaDeshabilitada.Provider value={deshabilitada}>
          {children}
          <div className="flex flex-wrap gap-3">
            {acciones}
            {pistasVistas < disponibles ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPistasVistas((vistas) => vistas + 1)}
              >
                Ver pista
              </Button>
            ) : null}
          </div>
        </TareaDeshabilitada.Provider>
      </fieldset>
      {pistas.length > 0 && disponibles === 0 && !aprobada && !bloqueo ? (
        <p className="text-sm text-muted-foreground">{`Primero intenta: las pistas aparecen después de ${INTENTOS_PARA_PISTA} intentos con un resultado incorrecto (los errores de código no cuentan). Llevas ${fallidos}.`}</p>
      ) : null}
      {pistasVistas > 0 ? (
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground">
          {pistas.slice(0, pistasVistas).map((pista) => (
            <li key={pista}>{pista}</li>
          ))}
        </ol>
      ) : null}
      {resultado ? (
        <p
          role="status"
          className={
            resultado.aprobada ? "notice notice-success" : "notice notice-error"
          }
        >
          {resultado.aprobada
            ? "¡Tarea aprobada!"
            : (resultado.diagnostico ?? "Todavía no. Revisa tu respuesta.")}
        </p>
      ) : null}
    </section>
  );
}
