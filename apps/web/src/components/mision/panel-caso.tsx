"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { cargarProgreso, dependenciasNavegador, type ProgresoVisible } from "@/lib/progreso/cliente";
import type { CasoCorto } from "@/lib/progreso/requisitos";

type MisionDelCaso = { slug: string; titulo: string; tiempo: number; tareas: string[]; sinGuia: boolean };

const MENSAJES_409: Record<string, string> = {
  misiones_pendientes: "Aprueba todas las misiones antes de enviar tu entregable.",
  entregable_aprobado: "Tu entregable ya fue aprobado.",
  caso_bloqueado: "Primero completa el caso anterior de la ruta.",
};

function etiquetaEstado(estado: "en_curso" | "aprobada" | undefined): string {
  if (estado === "aprobada") return "Aprobada";
  if (estado === "en_curso") return "En curso";
  return "Pendiente";
}

export function PanelCaso({ caso, misiones, entregable, requisitos }: { caso: string; misiones: MisionDelCaso[]; entregable: string; requisitos: CasoCorto[] }) {
  const [progreso, setProgreso] = useState<ProgresoVisible | null>(null);
  const [url, setUrl] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const tareasPorMision = useMemo(() => Object.fromEntries(misiones.map((mision) => [mision.slug, mision.tareas])), [misiones]);

  useEffect(() => {
    let vigente = true;
    void cargarProgreso(caso, tareasPorMision, dependenciasNavegador()).then((cargado) => {
      if (!vigente) return;
      setProgreso(cargado);
      if (cargado.entregable) setUrl(cargado.entregable);
    });
    return () => {
      vigente = false;
    };
  }, [caso, tareasPorMision]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setProblemas([]);
    try {
      const respuesta = await fetch("/api/entregables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caso, url }) });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string; problemas?: string[] };
      if (respuesta.ok) {
        setProgreso((actual) => (actual ? { ...actual, entregable: url, revision: { estado: "pendiente", comentario: null } } : actual));
        setMensaje("Recibimos tu entregable. Te avisaremos por email cuando lo revisen.");
      } else if (respuesta.status === 422) setProblemas(datos.problemas ?? []);
      else if (respuesta.status === 400) setMensaje("El enlace debe ser un repositorio de GitHub: https://github.com/tu-usuario/tu-repositorio");
      else if (respuesta.status === 409) setMensaje(MENSAJES_409[datos.error ?? ""] ?? "No pudimos enviar tu entregable.");
      else if (respuesta.status === 429) setMensaje("Enviaste varios entregables seguidos. Espera un rato antes de volver a intentarlo.");
      else setMensaje("No pudimos enviar tu entregable. Intenta de nuevo.");
    } catch {
      setMensaje("No pudimos enviar tu entregable. Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  }

  const casoPendiente = progreso ? (progreso.sesion ? progreso.bloqueadoPor : (requisitos[0] ?? null)) : null;
  const todasAprobadas = misiones.every((mision) => progreso?.misiones[mision.slug]?.estado === "aprobada");
  const revision = progreso?.revision ?? null;
  const volverAqui = `/login?callbackUrl=${encodeURIComponent(`/casos/${caso}`)}`;

  const formulario = (
    <form className="grid gap-3" onSubmit={enviar}>
      <Label>
        Enlace a tu repositorio de GitHub
        <Input name="url" type="url" required placeholder="https://github.com/tu-usuario/tu-repositorio" value={url} onChange={(evento) => setUrl(evento.target.value)} />
      </Label>
      <div><Button type="submit" disabled={enviando}>{enviando ? "Revisando tu repositorio…" : "Enviar a revisión"}</Button></div>
    </form>
  );

  return (
    <div className="grid gap-8">
      {casoPendiente ? (
        <p role="status" className="card p-4 text-sm leading-6">
          Puedes recorrer este caso, pero sus tareas se habilitan al completar{" "}
          <Link className="font-bold text-primary hover:underline" href={`/casos/${casoPendiente.slug}`}>{`«${casoPendiente.titulo}»`}</Link>.
          {progreso && !progreso.sesion ? <> <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></> : null}
        </p>
      ) : null}
      <ol className="grid gap-3">
        {misiones.map((mision, indice) => (
          <li key={mision.slug}>
            <Link href={`/casos/${caso}/${mision.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
              <span>
                <span className="block font-mono text-xs text-muted-foreground">{`Misión ${indice + 1} · ${mision.tiempo} min${mision.sinGuia ? " · sin guía" : ""}`}</span>
                <span className="block font-bold">{mision.titulo}</span>
              </span>
              <span data-testid={`estado-${mision.slug}`} className="badge">{etiquetaEstado(progreso?.misiones[mision.slug]?.estado)}</span>
            </Link>
          </li>
        ))}
      </ol>
      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Tu entregable</h2>
        <p className="leading-7 text-muted-foreground">{entregable}</p>
        {progreso?.completo ? <p role="status" className="font-bold text-primary">Caso completo</p> : null}
        {progreso?.certificados.length ? (
          <ul className="grid gap-2">
            {progreso.certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link className="font-bold text-primary hover:underline" href={`/certificados/${certificado.codigo}`}>
                  Ver certificado de {certificado.tipo === "ruta" ? "ruta" : "caso"}: {certificado.titulo}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {!progreso ? null : !progreso.sesion ? (
          <p className="text-sm">Para enviar tu entregable necesitas una cuenta. <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></p>
        ) : revision?.estado === "aprobado" ? (
          <p className="text-sm">
            Entregable aprobado: <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
          </p>
        ) : revision?.estado === "pendiente" ? (
          <p role="status" className="text-sm leading-6">
            Tu entregable está en revisión. Te avisaremos por email cuando lo revisen. Enviaste:{" "}
            <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
          </p>
        ) : !todasAprobadas ? (
          <p className="text-sm text-muted-foreground">Aprueba todas las misiones, incluida la misión sin guía, para enviar tu entregable a revisión.</p>
        ) : (
          <>
            {revision?.estado === "observado" ? (
              <div role="status" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6">
                <p className="font-bold">Tu docente pidió cambios:</p>
                <p className="whitespace-pre-wrap">{revision.comentario}</p>
                <p>Haz los ajustes en tu repositorio y vuelve a enviarlo.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Revisaremos que tu repositorio sea público, tenga un README y los archivos del caso. Luego, una persona lo revisa con la rúbrica del caso.</p>
            )}
            {formulario}
          </>
        )}

        {problemas.length > 0 ? (
          <div role="alert" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p className="font-bold">No pudimos aceptar tu entregable:</p>
            <ul className="list-disc pl-5">{problemas.map((problema) => <li key={problema}>{problema}</li>)}</ul>
          </div>
        ) : null}
        {mensaje ? <p role="status" className="text-sm font-bold">{mensaje}</p> : null}
      </section>
    </div>
  );
}
