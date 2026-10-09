"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buscar, type EntradaBusqueda } from "@/lib/buscador/buscar";
import { ETIQUETAS } from "./buscador";

type Estado = "sin-cargar" | "cargando" | "listo" | "error";

const MAXIMO_RESULTADOS = 8;

// La búsqueda de la v1: una ventana que se abre con Ctrl+K (⌘K en Mac) desde cualquier página. Sin JavaScript, el
// enlace lleva a /buscar.
export function BusquedaRapida() {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [abierta, setAbierta] = useState(false);
  const [estado, setEstado] = useState<Estado>("sin-cargar");
  const [indice, setIndice] = useState<EntradaBusqueda[]>([]);
  const [consulta, setConsulta] = useState("");
  const [seleccion, setSeleccion] = useState(0);
  const [atajo, setAtajo] = useState("Ctrl K");

  const abrir = useCallback(() => setAbierta(true), []);
  const cerrar = useCallback(() => setAbierta(false), []);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setAtajo("⌘K");
    function alPresionar(evento: KeyboardEvent) {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setAbierta(true);
      }
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  useEffect(() => {
    const ventana = dialogo.current;
    if (!ventana) return;
    if (abierta && !ventana.open) ventana.showModal();
    if (!abierta && ventana.open) ventana.close();
  }, [abierta]);

  // El índice se descarga una sola vez, la primera vez que se abre la ventana.
  useEffect(() => {
    if (!abierta || estado !== "sin-cargar") return;
    setEstado("cargando");
    fetch("/buscar/indice.json")
      .then((respuesta) => (respuesta.ok ? respuesta.json() : Promise.reject(new Error(String(respuesta.status)))))
      .then((datos: EntradaBusqueda[]) => {
        setIndice(datos);
        setEstado("listo");
      })
      .catch(() => setEstado("error"));
  }, [abierta, estado]);

  const resultados = useMemo(() => buscar(indice, consulta, MAXIMO_RESULTADOS), [indice, consulta]);

  function ir(href: string) {
    cerrar();
    setConsulta("");
    router.push(href);
  }

  function alEscribir(valor: string) {
    setConsulta(valor);
    setSeleccion(0);
  }

  function alNavegar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setSeleccion((actual) => Math.min(actual + 1, Math.max(resultados.length - 1, 0)));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setSeleccion((actual) => Math.max(actual - 1, 0));
    } else if (evento.key === "Escape") {
      // Escape cierra la ventana aunque el foco esté en el campo.
      evento.preventDefault();
      cerrar();
    } else if (evento.key === "Enter" && resultados[seleccion]) {
      evento.preventDefault();
      ir(resultados[seleccion].href);
    }
  }

  const hayConsulta = consulta.trim() !== "";

  return (
    <>
      <a
        href="/buscar"
        className="nav-link"
        aria-label="Buscar"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={(evento) => {
          evento.preventDefault();
          abrir();
        }}
      >
        <Search size={16} />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden rounded border border-border px-1.5 font-mono text-xs text-muted-foreground lg:inline">{atajo}</kbd>
      </a>
      <dialog
        ref={dialogo}
        aria-label="Buscar en syntaxError.cl"
        className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/60"
        // El navegador avisa el cierre después: si la ventana ya se volvió a abrir (Ctrl+K seguido), ese aviso no cuenta.
        onClose={() => {
          if (!dialogo.current?.open) cerrar();
        }}
        onClick={(evento) => {
          if (evento.target === evento.currentTarget) cerrar();
        }}
      >
        {abierta ? (
          <div className="mx-auto mt-20 w-[calc(100%-2rem)] max-w-lg rounded-md border border-border bg-surface shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search size={16} className="text-muted-foreground" />
              <input
                type="text"
                enterKeyHint="search"
                aria-label="Busca rutas, casos, misiones o lecciones"
                value={consulta}
                onChange={(evento) => alEscribir(evento.target.value)}
                onKeyDown={alNavegar}
                maxLength={100}
                autoFocus
                placeholder="Busca rutas, casos, misiones o lecciones..."
                className="flex-1 bg-transparent text-base text-foreground outline-none"
              />
              <button type="button" onClick={cerrar} aria-label="Cerrar la búsqueda" className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {estado === "cargando" ? <p className="p-3 text-sm text-muted-foreground">Cargando...</p> : null}
              {estado === "error" ? (
                <p role="status" className="p-3 text-sm text-muted-foreground">
                  <span className="typographic-glitch font-mono font-black text-accent" data-text="SEARCH_OFFLINE:">
                    SEARCH_OFFLINE:
                  </span>{" "}
                  La búsqueda no está disponible por ahora.
                </p>
              ) : null}
              {estado === "listo" && hayConsulta && resultados.length === 0 ? (
                <p role="status" className="p-3 text-sm text-muted-foreground">
                  <span className="typographic-glitch font-mono font-black text-accent" data-text="NO_MATCH_FOUND:">
                    NO_MATCH_FOUND:
                  </span>{" "}
                  {`No encontramos resultados para «${consulta.trim()}».`}
                </p>
              ) : null}
              {resultados.length > 0 ? (
                <ul aria-label="Resultados" className="grid gap-1">
                  {resultados.map((resultado, posicion) => (
                    <li key={resultado.href}>
                      <Link
                        href={resultado.href}
                        aria-current={posicion === seleccion ? "true" : undefined}
                        onClick={(evento) => {
                          evento.preventDefault();
                          ir(resultado.href);
                        }}
                        onMouseEnter={() => setSeleccion(posicion)}
                        className={`grid gap-0.5 rounded-md px-3 py-2 text-sm ${posicion === seleccion ? "bg-surface-raised" : ""}`}
                      >
                        <span className="font-bold">{resultado.titulo}</span>
                        <span className="font-mono text-xs text-muted-foreground">{`${ETIQUETAS[resultado.tipo]} · ${resultado.contexto}`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {hayConsulta && estado === "listo" ? (
              <div className="border-t border-border px-4 py-2 text-sm">
                <Link href={`/buscar?q=${encodeURIComponent(consulta.trim())}`} onClick={cerrar} className="font-bold text-accent hover:underline">
                  Ver todos los resultados
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
