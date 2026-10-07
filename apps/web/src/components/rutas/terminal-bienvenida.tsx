"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RutaSelector } from "./selector-rutas";

type Linea = { texto: string; tipo?: "error" | "muted" | "ok" };
type LineaArranque = { texto: string; clave?: string };

const AYUDA = [
  "comandos: help, ls rutas, cat <ruta>, elegir <ruta>, explorar, clear",
  "también sirven cd <ruta>, start <ruta>, salir y exit",
];

// Cuánto espera cada línea del arranque. Con movimiento reducido todo aparece de una vez.
const PASO_MS = 420;
const TECLA_MS = 45;

export function TerminalBienvenida({ nombre, handle, rutas, inicialAbierta }: { nombre: string; handle: string; rutas: RutaSelector[]; inicialAbierta: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const rutasMenu = useMemo(() => rutas.filter((ruta) => ruta.estadoVigente !== "oculta" && ruta.estadoVigente !== "borrador"), [rutas]);
  const elegibles = rutasMenu.filter((ruta) => ruta.estadoVigente === "publicada" || ruta.estadoVigente === "beta");
  const arranque = useMemo(() => inicio(nombre), [nombre]);
  const [abierta, setAbierta] = useState(inicialAbierta);
  // La primera vez, `explorar` guarda que ya la vio. Si se vuelve a abrir desde "¿Cómo funciona?", solo se cierra.
  const [primeraVez, setPrimeraVez] = useState(inicialAbierta);
  const [entrada, setEntrada] = useState("");
  const [seleccion, setSeleccion] = useState(() => Math.max(0, rutasMenu.findIndex((ruta) => ruta.estadoVigente === "publicada" || ruta.estadoVigente === "beta")));
  const [mostradas, setMostradas] = useState(0);
  const [tecleado, setTecleado] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const listo = mostradas >= arranque.length && tecleado === COMANDO_INICIAL;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (abierta && !dialog.open) dialog.showModal();
    if (!abierta && dialog.open) dialog.close();
  }, [abierta]);

  // El arranque: las líneas salen una tras otra y después la terminal teclea sola `ls rutas/`.
  useEffect(() => {
    if (!abierta) return;
    setMostradas(0);
    setTecleado("");
    setLineas([]);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMostradas(arranque.length);
      setTecleado(COMANDO_INICIAL);
      return;
    }
    const pendientes: number[] = [];
    arranque.forEach((_, indice) => pendientes.push(window.setTimeout(() => setMostradas(indice + 1), PASO_MS * (indice + 1))));
    const desde = PASO_MS * (arranque.length + 1);
    [...COMANDO_INICIAL].forEach((_, indice) => pendientes.push(window.setTimeout(() => setTecleado(COMANDO_INICIAL.slice(0, indice + 1)), desde + TECLA_MS * indice)));
    return () => pendientes.forEach((id) => window.clearTimeout(id));
  }, [abierta, arranque]);

  useEffect(() => {
    if (listo) inputRef.current?.focus();
  }, [listo]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mostradas, tecleado, lineas, listo]);

  function escribir(...nuevas: Linea[]) {
    setLineas((actuales) => [...actuales, ...nuevas]);
  }

  async function guardar(ruta: string | null) {
    const respuesta = await fetch("/api/cuenta/bienvenida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta }),
    }).catch(() => null);
    if (!respuesta?.ok) {
      escribir({ texto: "error: no se pudo guardar. intenta de nuevo", tipo: "error" });
      return false;
    }
    return true;
  }

  async function elegir(slugOriginal: string) {
    const slug = slugOriginal.replace(/\/$/, "");
    const ruta = rutasMenu.find((candidata) => candidata.slug === slug);
    if (!ruta) {
      escribir({ texto: `elegir: ruta no encontrada: ${slug} · prueba ls rutas`, tipo: "error" });
      return;
    }
    if (ruta.estadoVigente === "filtrada") {
      escribir({ texto: `acceso denegado: ${ruta.slug} · ${ruta.leak} · la ruta sigue compilando. Pronto se activa.`, tipo: "error" });
      return;
    }
    escribir({ texto: `❯ ${ruta.titulo} · ${ruta.cargo}` });
    if (!(await guardar(ruta.slug))) return;
    escribir({ texto: "[ok] ruta guardada en tu cuenta", tipo: "ok" }, { texto: `[ok] abriendo el mapa: primer paso ${ruta.primerPaso ?? ruta.titulo}`, tipo: "ok" });
    setPrimeraVez(false);
    setAbierta(false);
    router.push(`/rutas/${ruta.slug}`);
  }

  async function explorar() {
    if (primeraVez) {
      escribir({ texto: "[ok] entras sin ruta. puedes elegirla después desde el panel", tipo: "ok" });
      if (!(await guardar(null))) return;
      setPrimeraVez(false);
    }
    setAbierta(false);
    router.refresh();
  }

  function ficha(slugOriginal: string) {
    const slug = slugOriginal.replace(/\/$/, "");
    const ruta = rutasMenu.find((candidata) => candidata.slug === slug);
    if (!ruta) return escribir({ texto: `cat: ${slug}: no existe`, tipo: "error" });
    if (ruta.estadoVigente === "filtrada") return escribir({ texto: `${ruta.leak} · ${ruta.titulo} · ${ruta.cargo}` }, { texto: ruta.teaser ?? ruta.descripcion }, { texto: `[${ruta.slug.toUpperCase()}] :: buffer_corrupt`, tipo: "muted" });
    escribir({ texto: `${ruta.titulo} · ${ruta.cargo}` }, { texto: ruta.descripcion, tipo: "muted" });
  }

  function ejecutar(comandoCrudo: string) {
    const comando = comandoCrudo.trim();
    if (!comando) return;
    escribir({ texto: `${prompt(handle)} ${comando}`, tipo: "muted" });
    const [accion, ...resto] = comando.split(/\s+/);
    const arg = resto.join(" ");
    if (accion === "help" || accion === "ayuda") escribir(...AYUDA.map((texto) => ({ texto })));
    else if (accion === "ls") escribir({ texto: "rutas/ · usa ↑ ↓ y Enter, o toca una ruta", tipo: "muted" });
    else if (accion === "cat" && arg) ficha(arg);
    else if (["elegir", "cd", "start"].includes(accion) && arg) void elegir(arg);
    else if (["explorar", "exit", "salir"].includes(accion)) void explorar();
    else if (accion === "clear") setLineas([]);
    else escribir({ texto: `comando no encontrado: ${accion} · escribe help`, tipo: "error" });
  }

  function tecla(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setSeleccion((valor) => Math.min(rutasMenu.length - 1, valor + 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setSeleccion((valor) => Math.max(0, valor - 1));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (entrada.trim()) {
        ejecutar(entrada);
        setEntrada("");
      } else if (rutasMenu[seleccion]) {
        void elegir(rutasMenu[seleccion].slug);
      }
    }
  }

  return (
    <>
      <button type="button" className="font-bold text-primary hover:underline" onClick={() => setAbierta(true)}>
        ¿Cómo funciona?
      </button>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-label="Bienvenida a syntaxError.cl"
        className="welcome-terminal"
        onCancel={(evento) => {
          evento.preventDefault();
          escribir({ texto: "la bienvenida no se cierra con Esc: elige una ruta o escribe explorar", tipo: "error" });
        }}
      >
        <div className="welcome-terminal__bar">
          <i />
          <i />
          <i />
          <span>{`${handle}@syntaxerror.cl: ~/bienvenida`}</span>
        </div>
        <div className="welcome-terminal__scroll">
          <div aria-live="polite" className="grid gap-1">
            {arranque.slice(0, mostradas).map((linea, indice) =>
              linea.clave ? (
                <p key={`a${indice}`} className="welcome-terminal__boot">
                  <span className="font-bold text-emerald-400">[ok]</span>
                  <span className="text-violet-300">{linea.clave}</span>
                  <span className="text-zinc-400">{linea.texto}</span>
                </p>
              ) : (
                <p key={`a${indice}`}>
                  <span className="text-violet-300">{"> "}</span>
                  {linea.texto}
                </p>
              )
            )}
            {mostradas >= arranque.length ? (
              <p className="text-zinc-400">
                {`${prompt(handle)} ${tecleado}`}
                {listo ? null : <span className="welcome-terminal__cursor" aria-hidden="true" />}
              </p>
            ) : null}
          </div>
          {listo ? (
            <>
              <div role="listbox" aria-label="Rutas" className="mt-3 grid gap-1">
                {rutasMenu.map((ruta, indice) => (
                  <button
                    key={ruta.slug}
                    type="button"
                    role="option"
                    aria-selected={indice === seleccion}
                    aria-disabled={ruta.estadoVigente === "filtrada"}
                    className={`welcome-terminal__option ${indice === seleccion ? "is-selected" : ""}`}
                    onClick={() => {
                      setSeleccion(indice);
                      void elegir(ruta.slug);
                    }}
                  >
                    <span aria-hidden="true" className="welcome-terminal__arrow">{indice === seleccion ? "❯" : " "}</span>
                    {ruta.estadoVigente === "filtrada" ? (
                      <>
                        <span className="typographic-glitch leak-course-title welcome-terminal__slug" data-text={`${ruta.slug}/`}>{`${ruta.slug}/`}</span>
                        <span className="upcoming-leak-meta">{`${ruta.leak} / NO_ACTIVADO`}</span>
                      </>
                    ) : (
                      <>
                        <span className="welcome-terminal__slug font-bold">{`${ruta.slug}/`}</span>
                        <span className="text-zinc-400">{ruta.cargo}</span>
                        <span className={ruta.estadoVigente === "beta" ? "text-amber-300" : "text-emerald-400"}>{ruta.estadoVigente === "beta" ? "[beta]" : "[abierta]"}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-zinc-400">
                {elegibles.length === 0
                  ? "> las rutas están compilando. te avisamos cuando abra la primera. escribe explorar para entrar."
                  : "Usa ↑ ↓ y Enter para elegir, o escribe elegir <ruta>. help muestra los comandos."}
              </p>
              <div className="mt-2 grid gap-1">
                {lineas.map((linea, indice) => (
                  <p key={indice} className={claseLinea(linea)}>{linea.texto}</p>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label htmlFor="prompt-bienvenida" className="font-bold text-primary">
                  <span className="hidden sm:inline">{prompt(handle)}</span>
                  <span className="sm:hidden">~$</span>
                </label>
                <input
                  id="prompt-bienvenida"
                  ref={inputRef}
                  value={entrada}
                  onChange={(evento) => setEntrada(evento.target.value)}
                  onKeyDown={tecla}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="welcome-terminal__input min-w-0 flex-1 text-base text-zinc-100 caret-violet-300 sm:text-sm"
                  aria-label="Prompt de bienvenida"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
                {["ls rutas", "help", "explorar"].map((atajo) => (
                  <button key={atajo} type="button" className="rounded border border-zinc-700 px-2 py-1 text-xs text-violet-300" onClick={() => ejecutar(atajo)}>
                    {atajo === "explorar" ? "explorar sin elegir" : atajo}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                ¿Vienes por una clase de tu docente o solo a mirar? Escribe <span className="text-zinc-300">explorar</span>.
              </p>
            </>
          ) : null}
          <div ref={finRef} />
        </div>
      </dialog>
    </>
  );
}

const COMANDO_INICIAL = "ls rutas/";

function prompt(handle: string) {
  return `${handle}@syntaxerror.cl:~$`;
}

function claseLinea(linea: Linea): string {
  if (linea.tipo === "error") return "text-red-300";
  if (linea.tipo === "muted") return "text-zinc-400";
  if (linea.tipo === "ok") return "text-emerald-400";
  return "";
}

function inicio(nombre: string): LineaArranque[] {
  return [
    { texto: `hola, ${nombre}. iniciando syntaxError.cl…` },
    { clave: "rutas", texto: "eliges un oficio: cada ruta te prepara para un cargo" },
    { clave: "casos", texto: "resuelves problemas de empresas chilenas, misión por misión" },
    { clave: "ayudas", texto: "pistas si te trabas, tutor IA y asistente para conceptos" },
    { clave: "cierre", texto: "entregable → portafolio → certificado verificable" },
  ];
}
