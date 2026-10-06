"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { armarMapa, hashCorto, type AvanceCaso, type EstadoPieza, type PiezaMapa, type PiezaRuta } from "@/lib/rutas/mapa";
import { AvisoBeta } from "../mision/aviso-beta";

// La ruta como un `git log --graph --reverse`: main avanza con los casos y cada clase es una rama que sale de main y
// se fusiona en el caso que la aplica. La página es estática; el avance de la persona se pide al cargar.

type Props = { ruta: { slug: string; titulo: string; beta?: boolean }; piezas: PiezaRuta[] };

const NODO: Record<EstadoPieza, string> = {
  completo: "border-success bg-success",
  en_curso: "border-primary bg-background",
  en_revision: "border-warning bg-warning/40",
  bloqueado: "border-dashed border-muted-foreground bg-background",
  disponible: "border-primary bg-background",
};

// La línea que llega a un nodo: verde si ese tramo ya se recorrió, punteada si está bloqueado.
function linea(estado: EstadoPieza | "release") {
  if (estado === "completo") return "border-success";
  if (estado === "bloqueado" || estado === "release") return "border-dashed border-border";
  return "border-border";
}

function Decoracion({ children, tono }: { children: React.ReactNode; tono: "head" | "rama" | "tag" }) {
  const borde = tono === "head" ? "border-primary" : tono === "rama" ? "border-success" : "border-warning";
  return <span className={`rounded border px-1 font-mono text-[11px] font-bold leading-5 text-foreground ${borde}`}>{children}</span>;
}

function Estado({ pieza }: { pieza: PiezaMapa }) {
  // Sin encogerse ni partirse: en un teléfono la etiqueta queda junto al título, completa.
  const base = "shrink-0 whitespace-nowrap font-mono text-[11px] font-black uppercase";
  if (pieza.estado === "completo") return <span className={`${base} text-foreground`}>✔ merged</span>;
  if (pieza.estado === "en_revision") return <span className={`${base} text-foreground`}>PR en revisión</span>;
  if (pieza.estado === "bloqueado") {
    return (
      <span className={`${base} typographic-glitch text-muted-foreground`} data-text="LOCKED">
        LOCKED
      </span>
    );
  }
  return null;
}

function etiquetaEstado(pieza: PiezaMapa): string {
  if (pieza.estado === "completo") return "completo";
  if (pieza.estado === "en_curso") return pieza.aprobadas > 0 ? "en curso" : "siguiente";
  if (pieza.estado === "en_revision") return "entregable en revisión";
  if (pieza.estado === "bloqueado") return "bloqueado";
  return "disponible";
}

function muestraAvance(pieza: PiezaMapa): boolean {
  if (pieza.estado === "en_curso" || pieza.estado === "en_revision") return true;
  return (pieza.estado === "bloqueado" || pieza.estado === "disponible") && pieza.aprobadas > 0;
}

function accionDe(pieza: PiezaMapa): string | null {
  if (pieza.estado === "bloqueado" || pieza.estado === "completo") return null;
  if (pieza.estado === "en_revision") return "Ver tu entregable →";
  return pieza.aprobadas > 0 ? "Continuar →" : "Empezar →";
}

function Commit({ pieza, mensaje, decoraciones }: { pieza: PiezaMapa; mensaje: string; decoraciones: React.ReactNode }) {
  const unidad = pieza.tipo === "clases" ? "lecciones" : "misiones";
  const aqui = pieza.estado === "en_curso" || pieza.estado === "en_revision";
  const conAvance = muestraAvance(pieza);
  const detalle = pieza.tipo === "clases" ? `${pieza.unidades} ${unidad}` : `Caso ${pieza.numeroCaso} · ${pieza.empresa} · ${pieza.unidades} ${unidad}`;
  const accion = accionDe(pieza);
  return (
    <Link
      href={`/casos/${pieza.slug}`}
      aria-label={`${pieza.titulo}: ${etiquetaEstado(pieza)}`}
      className={`card grid min-w-0 flex-1 gap-1.5 p-4 hover:border-primary ${pieza.estado === "bloqueado" ? "opacity-70" : ""} ${aqui ? "border-primary ring-2 ring-primary/50" : ""}`}
    >
      <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <span>{pieza.hash}</span>
        {decoraciones}
        {aqui ? <span className="rounded border border-primary px-1 font-mono text-[11px] font-bold leading-5 text-primary">Estás aquí</span> : null}
        <span className="min-w-0 truncate">{mensaje}</span>
      </span>
      <span className="flex items-start justify-between gap-3">
        <span className="font-black leading-snug">{pieza.titulo}</span>
        <Estado pieza={pieza} />
      </span>
      <span className="text-sm text-muted-foreground">{detalle}</span>
      {accion ? <span className="font-mono text-xs font-black text-primary">{accion}</span> : null}
      {conAvance ? (
        <span className="grid gap-1">
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((pieza.aprobadas / Math.max(pieza.unidades, 1)) * 100)}%` }} />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {pieza.estado === "en_revision" ? "Misiones listas: falta que aprueben tu entregable" : `${pieza.aprobadas}/${pieza.unidades} ${unidad}`}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

// Las dos líneas del grafo: main (izquierda) y la rama de las clases (derecha). `tramo` dibuja cada fila.
function Carril({ main, rama, nodo }: { main: string | null; rama?: string | null; nodo?: { carril: "main" | "rama"; clase: string; actual: boolean } }) {
  return (
    <span aria-hidden="true" className="relative block w-12 shrink-0 self-stretch">
      {main ? <span className={`absolute inset-y-0 left-[11px] border-l-2 ${main}`} /> : null}
      {rama ? <span className={`absolute inset-y-0 left-[35px] border-l-2 ${rama}`} /> : null}
      {nodo ? (
        <span className={`absolute top-5 size-4 rounded-full border-2 ${nodo.carril === "main" ? "left-1" : "left-7"} ${nodo.clase}`}>
          {nodo.actual ? <span className="absolute -inset-1 rounded-full border-2 border-primary motion-safe:animate-ping" /> : null}
        </span>
      ) : null}
    </span>
  );
}

// La curva que sale de main hacia la rama (o vuelve), en una fila corta.
function Curva({ hacia, main, rama }: { hacia: "rama" | "main"; main: string; rama: string }) {
  return (
    <li aria-hidden="true" className="flex h-6">
      <span className="relative block w-12 shrink-0">
        <span className={`absolute inset-y-0 left-[11px] border-l-2 ${main}`} />
        <svg className="absolute inset-0 overflow-visible" width="48" height="24" viewBox="0 0 48 24" fill="none">
          <path
            d={hacia === "rama" ? "M12 0 C 12 14, 36 10, 36 24" : "M36 0 C 36 14, 12 10, 12 24"}
            className={rama.includes("success") ? "stroke-success" : "stroke-border"}
            strokeWidth="2"
            strokeDasharray={rama.includes("dashed") ? "4 3" : undefined}
          />
        </svg>
      </span>
    </li>
  );
}

export function MapaRuta({ ruta, piezas }: Props) {
  const [avance, setAvance] = useState<Record<string, AvanceCaso> | null>(null);
  const [ordenLibre, setOrdenLibre] = useState(false);
  const [conBeta, setConBeta] = useState(false);
  const [sesion, setSesion] = useState<"cargando" | "con" | "sin">("cargando");

  useEffect(() => {
    let vigente = true;
    fetch("/api/progreso/resumen", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!vigente) return;
        if (!respuesta.ok) return setSesion("sin");
        const datos = (await respuesta.json()) as { casos: Record<string, AvanceCaso>; ordenLibre?: boolean; accesoBeta?: boolean };
        if (!vigente) return;
        setAvance(datos.casos);
        setOrdenLibre(Boolean(datos.ordenLibre));
        setConBeta(Boolean(datos.accesoBeta));
        setSesion("con");
      })
      .catch(() => vigente && setSesion("sin"));
    return () => {
      vigente = false;
    };
  }, []);

  const { etapas, resumen } = armarMapa(piezas, avance, { ordenLibre });
  const ultimoCaso = [...etapas].reverse().find((etapa) => etapa.caso)?.caso ?? null;
  const release = resumen.completa ? "completo" : "release";

  return (
    <div className="grid gap-6">
      {ruta.beta && sesion !== "cargando" ? (
        sesion === "con" && conBeta ? (
          <p role="status" className="card p-4 text-sm leading-6">
            <span className="badge mr-2">Beta</span>
            Estás probando esta ruta antes que el resto. Si algo falla o no se entiende, usa «Reportar un problema» al pie de la página.
          </p>
        ) : (
          <AvisoBeta sesion={sesion === "con"} volverA={`/rutas/${ruta.slug}`} className="card p-4" />
        )
      ) : null}
      {sesion === "con" ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Tu avance en la ruta">
          <Barra etiqueta="Lecciones" descripcion="Lecciones aprobadas" valor={resumen.leccionesAprobadas} total={resumen.lecciones} />
          <Barra etiqueta="Casos" descripcion="Casos completados" valor={resumen.casosCompletos} total={resumen.casos} />
        </div>
      ) : sesion === "sin" ? (
        <p className="card p-4 text-sm leading-6">
          <span className="font-mono font-bold text-primary">{"$ git config user.name "}</span>
          <span className="text-muted-foreground">sin configurar. </span>
          <Link className="font-bold text-primary hover:underline" href={`/registro?callbackUrl=${encodeURIComponent(`/rutas/${ruta.slug}`)}`}>
            Crea tu cuenta
          </Link>{" "}
          para guardar tu avance y ver dónde está tu HEAD.
        </p>
      ) : (
        <div className="h-14" aria-hidden="true" />
      )}

      <Leyenda />
      <ol className="grid" aria-label={`Mapa de la ruta ${ruta.titulo}`}>
        {etapas.map((etapa, indice) => {
          const clases = etapa.clases;
          const caso = etapa.caso;
          const lineaMain = linea(clases?.estado ?? caso?.estado ?? "disponible");
          return [
            clases ? <Curva key={`${indice}-sale`} hacia="rama" main={lineaMain} rama={linea(clases.estado)} /> : null,
            clases ? (
              <li key={clases.slug} className="flex gap-1 pb-3">
                <Carril main={lineaMain} rama={linea(clases.estado)} nodo={{ carril: "rama", clase: NODO[clases.estado], actual: clases.estado === "en_curso" }} />
                <Commit
                  pieza={clases}
                  mensaje={`feat: ${clases.unidades} lecciones`}
                  decoraciones={
                    <>
                      {clases.estado === "en_curso" ? <Decoracion tono="head">HEAD -&gt; tú</Decoracion> : null}
                      <Decoracion tono="rama">{etapa.rama}</Decoracion>
                    </>
                  }
                />
              </li>
            ) : null,
            clases && caso ? <Curva key={`${indice}-vuelve`} hacia="main" main={lineaMain} rama={linea(clases.estado)} /> : null,
            caso ? (
              <li key={caso.slug} className="flex gap-1 pb-3">
                <Carril main={linea(caso.estado)} nodo={{ carril: "main", clase: NODO[caso.estado], actual: caso.estado === "en_curso" || caso.estado === "en_revision" }} />
                <Commit
                  pieza={caso}
                  mensaje={indice === 0 && !clases ? "Initial commit" : etapa.rama ? `Merge branch '${etapa.rama}'` : "feat: caso"}
                  decoraciones={
                    <>
                      {caso.estado === "en_curso" || caso.estado === "en_revision" ? <Decoracion tono="head">HEAD -&gt; tú</Decoracion> : null}
                      {caso === ultimoCaso ? <Decoracion tono="tag">deploy</Decoracion> : null}
                    </>
                  }
                />
              </li>
            ) : null,
          ];
        })}
        <li className="flex gap-1">
          <Carril main={linea(release)} nodo={{ carril: "main", clase: resumen.completa ? NODO.completo : "border-warning bg-background", actual: false }} />
          <div className={`card grid min-w-0 flex-1 gap-1.5 border-warning p-4 ${resumen.completa ? "" : "opacity-80"}`}>
            <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span>{hashCorto(`${ruta.slug}-release`)}</span>
              <Decoracion tono="tag">tag: v1.0</Decoracion>
              <span>release</span>
            </span>
            <span className="font-black">{`Certificado ${ruta.titulo}`}</span>
            <span className="text-sm text-muted-foreground">
              {resumen.completa ? (
                <Link className="font-bold text-primary hover:underline" href="/dashboard">
                  Ver tu certificado en el panel
                </Link>
              ) : (
                "Se publica al completar todos los casos y clases de la ruta."
              )}
            </span>
          </div>
        </li>
      </ol>
    </div>
  );
}

function Barra({ etiqueta, descripcion, valor, total }: { etiqueta: string; descripcion: string; valor: number; total: number }) {
  const porcentaje = Math.round((valor / Math.max(total, 1)) * 100);
  return (
    <div className="card grid gap-2 p-4">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-black">{etiqueta}</span>
        <span className="font-mono text-sm text-muted-foreground">{`${valor}/${total}`}</span>
      </span>
      <span className="h-2 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label={descripcion} aria-valuemin={0} aria-valuemax={total} aria-valuenow={valor}>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} />
      </span>
    </div>
  );
}

// El mapa usa palabras de git (lo que enseña la ruta); esto las traduce para quien recién empieza.
function Leyenda() {
  const filas: [string, string][] = [
    ["main", "la ruta, de arriba hacia abajo"],
    ["clases/...", "una rama de clases: aprendes ahí y se fusiona en el caso que lo aplica"],
    ["HEAD -> tú", "dónde estás"],
    ["✔ merged", "completado"],
    ["PR en revisión", "tus misiones están listas; falta que aprueben tu entregable"],
    ["LOCKED", "se habilita al completar lo anterior"],
    ["tag: v1.0", "el certificado de la ruta"],
  ];
  return (
    <details className="card p-4 text-sm">
      <summary className="cursor-pointer font-bold">¿Cómo leer este mapa?</summary>
      <dl className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-4">
        {filas.map(([termino, significado]) => (
          <div key={termino} className="grid gap-0.5 sm:contents">
            <dt className="font-mono text-xs font-bold text-foreground sm:pt-0.5">{termino}</dt>
            <dd className="text-muted-foreground">{significado}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
