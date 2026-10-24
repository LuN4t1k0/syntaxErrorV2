"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Lock, ShieldCheck } from "lucide-react";
import { armarMapa, hashCorto, type AvanceCaso, type EstadoPieza, type PiezaMapa, type PiezaRuta } from "@/lib/rutas/mapa";
import { AvisoBeta } from "../mision/aviso-beta";

// La ruta como un `git log --graph --reverse`: main avanza con los casos y cada clase es una rama que sale de main y
// se fusiona en el caso que la aplica. La página es estática; el avance de la persona se pide al cargar.

type Props = { ruta: { slug: string; titulo: string; beta?: boolean }; piezas: PiezaRuta[] };

// El estado de cada pieza decide el color del nodo, de la línea que llega a él y de su tarjeta (rutas/mapa.css).
function linea(estado: EstadoPieza | "release") {
  if (estado === "completo") return "mapa-linea-hecha";
  if (estado === "bloqueado" || estado === "release") return "mapa-linea-futura";
  return "mapa-linea";
}

function Decoracion({ children, tono }: { children: React.ReactNode; tono: "head" | "rama" | "tag" }) {
  return <span className={`mapa-deco mapa-deco-${tono}`}>{children}</span>;
}

function etiquetaEstado(pieza: PiezaMapa): string {
  if (pieza.estado === "completo") return "completo";
  if (pieza.estado === "en_curso") return pieza.aprobadas > 0 ? "en curso" : "siguiente";
  if (pieza.estado === "en_revision") return "entregable en revisión";
  if (pieza.estado === "bloqueado") return pieza.aprobadas > 0 ? "en pausa" : "bloqueado";
  return "disponible";
}

function accionDe(pieza: PiezaMapa): string | null {
  // La acción va solo donde está la persona: con varias tarjetas diciendo "Empezar", el mapa no guía (auditoría, 8e).
  if (pieza.estado !== "en_curso" && pieza.estado !== "en_revision") return null;
  if (pieza.estado === "en_revision") return "Ver tu entregable";
  return pieza.aprobadas > 0 ? "Continuar" : "Empezar";
}

function Estado({ pieza }: { pieza: PiezaMapa }) {
  if (pieza.estado === "completo") return <span className="mapa-estado mapa-estado-hecho" title="merged"><Check size={13} aria-hidden="true" /> Completado</span>;
  if (pieza.estado === "en_revision") return <span className="mapa-estado mapa-estado-revision" title="Pull request">En revisión</span>;
  if (pieza.estado === "bloqueado") {
    return (
      <span className="mapa-estado" title="LOCKED">
        <Lock size={12} aria-hidden="true" /> {pieza.aprobadas > 0 ? "En pausa" : "Bloqueado"}
      </span>
    );
  }
  return null;
}

function Commit({ pieza, mensaje, decoraciones, anterior }: { pieza: PiezaMapa; mensaje: string; decoraciones: React.ReactNode; anterior: string | null }) {
  const unidad = pieza.tipo === "clases" ? "lecciones" : "misiones";
  const aqui = pieza.estado === "en_curso" || pieza.estado === "en_revision";
  const detalle = pieza.tipo === "clases" ? `${pieza.unidades} ${unidad}` : `Caso ${pieza.numeroCaso} · ${pieza.empresa} · ${pieza.unidades} ${unidad}`;
  const accion = accionDe(pieza);
  const porcentaje = Math.round((pieza.aprobadas / Math.max(pieza.unidades, 1)) * 100);
  return (
    <Link href={`/casos/${pieza.slug}`} aria-label={`${pieza.titulo}: ${etiquetaEstado(pieza)}`} className={`mapa-commit mapa-commit-${pieza.estado}`}>
      <span className="mapa-commit-meta">
        <span>{pieza.hash}</span>
        {decoraciones}
        {aqui ? <span className="mapa-deco mapa-deco-aqui">Estás aquí</span> : null}
        <span className="min-w-0 truncate">{mensaje}</span>
      </span>
      <span className="mapa-commit-cabeza">
        <span className="mapa-commit-titulo">{pieza.titulo}</span>
        <Estado pieza={pieza} />
      </span>
      <span className="mapa-commit-detalle">{detalle}</span>
      {aqui ? (
        <span className="mapa-commit-aqui">
          <span className="mapa-avance">
            <span className="panel-barra"><span style={{ width: `${porcentaje}%` }} /></span>
            <span>{pieza.estado === "en_revision" ? "Misiones listas: falta que aprueben tu entregable" : `${pieza.aprobadas}/${pieza.unidades} ${unidad}`}</span>
          </span>
          {accion ? <span className="panel-boton panel-boton-primario">{accion}</span> : null}
        </span>
      ) : null}
      {pieza.estado === "bloqueado" ? (
        <span className="mapa-commit-nota">
          {pieza.aprobadas > 0 ? `Tu avance (${pieza.aprobadas}/${pieza.unidades}) queda guardado. ` : ""}
          {anterior ? `Se abre al completar ${anterior}.` : "Se abre al completar lo anterior."}
        </span>
      ) : null}
    </Link>
  );
}

// Las dos líneas del grafo: main (izquierda) y la rama de las clases (derecha). `tramo` dibuja cada fila.
function Carril({ main, rama, nodo }: { main: string | null; rama?: string | null; nodo?: { carril: "main" | "rama"; estado: EstadoPieza | "release" | "release-hecho"; actual: boolean } }) {
  return (
    <span aria-hidden="true" className="mapa-carril">
      {main ? <span className={`mapa-via mapa-via-main ${main}`} /> : null}
      {rama ? <span className={`mapa-via mapa-via-rama ${rama}`} /> : null}
      {nodo ? (
        <span className={`mapa-nodo mapa-nodo-${nodo.carril} mapa-nodo-${nodo.estado}`}>
          {nodo.estado === "completo" ? <Check size={10} strokeWidth={3} /> : null}
          {nodo.actual ? <span className="mapa-nodo-pulso" /> : null}
        </span>
      ) : null}
    </span>
  );
}

// La curva que sale de main hacia la rama (o vuelve), en una fila corta.
function Curva({ hacia, main, rama }: { hacia: "rama" | "main"; main: string; rama: string }) {
  return (
    <li aria-hidden="true" className="flex h-6">
      <span className="mapa-carril">
        <span className={`mapa-via mapa-via-main ${main}`} />
        <svg className="absolute inset-0 overflow-visible" width="48" height="24" viewBox="0 0 48 24" fill="none">
          <path d={hacia === "rama" ? "M12 0 C 12 14, 36 10, 36 24" : "M36 0 C 36 14, 12 10, 12 24"} className={`mapa-curva ${rama}`} strokeWidth="2" />
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
  // En orden: cada pieza bloqueada se abre al completar la que va justo antes.
  const orden = etapas.flatMap((etapa) => [etapa.clases, etapa.caso]).filter((pieza): pieza is PiezaMapa => pieza !== null);
  const anteriorDe = (pieza: PiezaMapa) => orden[orden.indexOf(pieza) - 1]?.titulo ?? null;
  const piezasHechas = orden.filter((pieza) => pieza.estado === "completo").length;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      {ruta.beta && sesion !== "cargando" ? (
        sesion === "con" && conBeta ? (
          <p role="status" className="panel-aviso">
            <span className="panel-chip mr-2">Beta</span>
            Estás probando esta ruta antes que el resto. Si algo falla o no se entiende, usa «Reportar un problema» al pie de la página.
          </p>
        ) : (
          <AvisoBeta sesion={sesion === "con"} volverA={`/rutas/${ruta.slug}`} className="panel-aviso" />
        )
      ) : null}
      {sesion === "con" ? (
        <div className="panel-card mapa-avance-ruta" aria-label="Tu avance en la ruta">
          <p className="panel-avance-linea">
            <span>Progreso de la ruta</span>
            <strong>{`${piezasHechas} de ${piezas.length} pasos completados`}</strong>
          </p>
          <span className="panel-barra" role="progressbar" aria-label="Pasos completados" aria-valuemin={0} aria-valuemax={piezas.length} aria-valuenow={piezasHechas}>
            <span style={{ width: `${Math.round((piezasHechas / Math.max(piezas.length, 1)) * 100)}%` }} />
          </span>
          <p className="mapa-avance-detalle">
            <span role="progressbar" aria-label="Lecciones aprobadas" aria-valuemin={0} aria-valuemax={resumen.lecciones} aria-valuenow={resumen.leccionesAprobadas}>{`lecciones ${resumen.leccionesAprobadas}/${resumen.lecciones}`}</span>
            <span aria-hidden="true">·</span>
            <span role="progressbar" aria-label="Casos completados" aria-valuemin={0} aria-valuemax={resumen.casos} aria-valuenow={resumen.casosCompletos}>{`casos ${resumen.casosCompletos}/${resumen.casos}`}</span>
          </p>
        </div>
      ) : sesion === "sin" ? (
        <p className="panel-aviso">
          <span className="font-mono font-bold text-accent">{"$ git config user.name "}</span>
          <span className="text-muted-foreground">sin configurar. </span>
          <Link className="font-bold text-accent hover:underline" href={`/registro?callbackUrl=${encodeURIComponent(`/rutas/${ruta.slug}`)}`}>
            Crea tu cuenta
          </Link>{" "}
          para guardar tu avance y retomar tu siguiente paso.
        </p>
      ) : (
        <div className="h-14" aria-hidden="true" />
      )}

      <Leyenda />
      <ol className="mapa grid min-w-0 grid-cols-1" aria-label={`Mapa de la ruta ${ruta.titulo}`}>
        {etapas.map((etapa, indice) => {
          const clases = etapa.clases;
          const caso = etapa.caso;
          const lineaMain = linea(clases?.estado ?? caso?.estado ?? "disponible");
          return [
            clases ? <Curva key={`${indice}-sale`} hacia="rama" main={lineaMain} rama={linea(clases.estado)} /> : null,
            clases ? (
              <li key={clases.slug} className="flex gap-1 pb-3">
                <Carril main={lineaMain} rama={linea(clases.estado)} nodo={{ carril: "rama", estado: clases.estado, actual: clases.estado === "en_curso" }} />
                <Commit
                  anterior={anteriorDe(clases)}
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
                <Carril main={linea(caso.estado)} nodo={{ carril: "main", estado: caso.estado, actual: caso.estado === "en_curso" || caso.estado === "en_revision" }} />
                <Commit
                  anterior={anteriorDe(caso)}
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
          <Carril main={linea(release)} nodo={{ carril: "main", estado: resumen.completa ? "release-hecho" : "release", actual: false }} />
          <div className={`mapa-release ${resumen.completa ? "mapa-release-hecho" : ""}`}>
            <span className="mapa-commit-meta">
              <span>{hashCorto(`${ruta.slug}-release`)}</span>
              <Decoracion tono="tag">tag: v1.0</Decoracion>
              <span>release</span>
            </span>
            <span className="mapa-sello" aria-hidden="true">
              <ShieldCheck size={40} />
              <strong>SYNTAXERROR.CL CERTIFIED</strong>
              <span>{resumen.completa ? "verificable" : "pending"}</span>
            </span>
            <span className="mapa-commit-titulo">{`Certificado ${ruta.titulo}`}</span>
            <span className="mapa-commit-detalle">
              {resumen.completa ? (
                <Link className="panel-enlace" href="/dashboard">
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

// El mapa usa palabras de git (lo que enseña la ruta); esto las traduce para quien recién empieza.
function Leyenda() {
  const filas: [string, string][] = [
    ["main", "la ruta, de arriba hacia abajo"],
    ["clases/...", "una rama de clases: aprendes ahí y se fusiona en el caso que lo aplica"],
    ["HEAD -> tú", "dónde estás"],
    ["✔ Completado", "merged: ya completaste este paso"],
    ["En revisión", "tus misiones están listas; falta que aprueben tu entregable"],
    ["Bloqueado", "se habilita al completar lo anterior"],
    ["En pausa", "avanzaste antes, pero se retoma cuando llegues a ese paso"],
    ["tag: v1.0", "el certificado de la ruta"],
  ];
  return (
    <details className="panel-card mapa-leyenda">
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
