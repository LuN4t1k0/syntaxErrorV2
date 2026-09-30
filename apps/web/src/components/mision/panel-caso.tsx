"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { cargarProgreso, dependenciasNavegador, type ProgresoVisible } from "@/lib/progreso/cliente";

type MisionDelCaso = { slug: string; titulo: string; tiempo: number; tareas: string[] };

function etiquetaEstado(estado: "en_curso" | "aprobada" | undefined): string {
  if (estado === "aprobada") return "Aprobada";
  if (estado === "en_curso") return "En curso";
  return "Pendiente";
}

export function PanelCaso({ caso, misiones, entregable }: { caso: string; misiones: MisionDelCaso[]; entregable: string }) {
  const [progreso, setProgreso] = useState<ProgresoVisible | null>(null);
  const [url, setUrl] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const tareasPorMision = useMemo(() => Object.fromEntries(misiones.map((mision) => [mision.slug, mision.tareas])), [misiones]);
  useEffect(() => {
    let vigente = true;
    void cargarProgreso(caso, tareasPorMision, dependenciasNavegador()).then((cargado) => {
      if (!vigente) return;
      setProgreso(cargado);
      if (cargado.entregable) setUrl(cargado.entregable);
    });
    return () => { vigente = false; };
  }, [caso, tareasPorMision]);
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch("/api/entregables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caso, url }) });
      if (respuesta.status === 400) { setMensaje("El enlace debe ser una URL completa que empiece con https://"); return; }
      if (!respuesta.ok) { setMensaje("No pudimos guardar el entregable. Intenta de nuevo."); return; }
      const { casoCompleto, certificados = [] } = (await respuesta.json()) as { casoCompleto: boolean; certificados?: ProgresoVisible["certificados"] };
      setProgreso((actual) => (actual ? { ...actual, entregable: url, completo: casoCompleto, certificados: [...actual.certificados, ...certificados] } : actual));
      if (certificados.length > 0) {
        setMensaje("Entregable guardado. Certificado emitido.");
      } else {
        setMensaje(casoCompleto ? "Entregable guardado. ¡Terminaste el caso!" : "Entregable guardado. Te faltan misiones por aprobar.");
      }
    } catch {
      setMensaje("No pudimos guardar el entregable. Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  }
  const volverAqui = `/login?callbackUrl=${encodeURIComponent(`/casos/${caso}`)}`;
  return (
    <div className="grid gap-8">
      <ol className="grid gap-3">
        {misiones.map((mision, indice) => (
          <li key={mision.slug}>
            <Link href={`/casos/${caso}/${mision.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
              <span><span className="block font-mono text-xs text-muted-foreground">{`Misión ${indice + 1} · ${mision.tiempo} min`}</span><span className="block font-bold">{mision.titulo}</span></span>
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
        {progreso && !progreso.sesion ? (
          <p className="text-sm">Para enlazar tu entregable necesitas una cuenta. <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></p>
        ) : (
          <form className="grid gap-3" onSubmit={guardar}>
            <Label>Enlace a tu entregable<Input name="url" type="url" required placeholder="https://github.com/tu-usuario/tu-repo" value={url} onChange={(evento) => setUrl(evento.target.value)} /></Label>
            <div><Button type="submit" disabled={enviando}>{enviando ? "Guardando..." : "Guardar entregable"}</Button></div>
            {mensaje ? <p role="status" className="text-sm font-bold">{mensaje}</p> : null}
          </form>
        )}
      </section>
    </div>
  );
}
