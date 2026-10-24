"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { iniciales } from "@/lib/panel/contenido";

export type RutaSelector = {
  slug: string;
  titulo: string;
  cargo: string;
  descripcion: string;
  teaser?: string | null;
  estadoVigente: "publicada" | "beta" | "filtrada" | "borrador" | "oculta";
  casos: string[];
  totalCasos: number;
  totalClases: number;
  primerPaso: string | null;
  primerPasoHref: string | null;
  leak: string;
  tecnologias?: string[];
};

export function SelectorRutas({ rutas, sesion, accion = "Elegir" }: { rutas: RutaSelector[]; sesion: boolean; accion?: "Elegir" | "Empezar" }) {
  const router = useRouter();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function elegir(slug: string) {
    if (!sesion) {
      router.push(`/registro?callbackUrl=${encodeURIComponent(`/rutas/${slug}`)}`);
      return;
    }
    setGuardando(slug);
    setError(null);
    const respuesta = await fetch("/api/cuenta/ruta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta: slug }),
    });
    setGuardando(null);
    if (respuesta.ok) router.push(`/rutas/${slug}`);
    else setError("No se pudo guardar la ruta. Intenta de nuevo.");
  }

  const visibles = rutas.filter((ruta) => ruta.estadoVigente !== "oculta" && ruta.estadoVigente !== "borrador");

  if (visibles.length === 0) {
    return <p className="text-muted-foreground">Estamos terminando la primera ruta. Vuelve pronto.</p>;
  }

  return (
    <div className="grid gap-4">
      {error ? <p role="status" className="text-sm font-bold text-error-text">{error}</p> : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {visibles.map((ruta) =>
          ruta.estadoVigente === "filtrada" ? (
            <li key={ruta.slug} className="leak-course-card grid gap-3 p-5">
              <p className="upcoming-leak-meta">{ruta.leak} / NO_ACTIVADO</p>
              <h3 className="typographic-glitch leak-course-title text-xl font-black" data-text={ruta.titulo}>
                {ruta.titulo}
              </h3>
              <p className="text-sm font-bold text-muted-foreground">{ruta.cargo}</p>
              <p className="text-sm leading-6 text-muted-foreground">{ruta.teaser ?? ruta.descripcion}</p>
              <p className="upcoming-leak-fragment">[{ruta.slug.toUpperCase()}] :: buffer_corrupt</p>
            </li>
          ) : (
            <li key={ruta.slug}>
              <article className="panel-card panel-ruta panel-ruta-activa h-full">
                <div className="panel-ruta-cabeza">
                  <span className="panel-ruta-sigla" aria-hidden="true">{iniciales(ruta.titulo)}</span>
                  <div className="min-w-0 flex-1">
                    <h3>
                      {ruta.titulo}
                      {ruta.estadoVigente === "beta" ? <span className="panel-chip">beta</span> : null}
                    </h3>
                    <p className="panel-ruta-cargo">{ruta.cargo}</p>
                  </div>
                </div>
                <p className="panel-ruta-texto">{ruta.descripcion}</p>
                <p className="panel-nota">{conteo(ruta)}</p>
                {ruta.tecnologias?.length ? (
                  <p className="panel-tecnologias">
                    <span>stack:</span>
                    {ruta.tecnologias.map((tecnologia) => <code key={tecnologia}>{tecnologia}</code>)}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="panel-boton panel-boton-primario" disabled={guardando === ruta.slug} onClick={() => void elegir(ruta.slug)}>
                    {guardando === ruta.slug ? "Guardando..." : accion}
                  </button>
                  <Link className="panel-boton panel-boton-claro" href={`/rutas/${ruta.slug}`}>
                    Ver mapa
                  </Link>
                </div>
              </article>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

function conteo(ruta: RutaSelector): string {
  const casos = `${ruta.totalCasos} ${ruta.totalCasos === 1 ? "caso" : "casos"}`;
  return ruta.totalClases > 0 ? `${casos} · ${ruta.totalClases} ${ruta.totalClases === 1 ? "bloque" : "bloques"} de clases` : casos;
}
