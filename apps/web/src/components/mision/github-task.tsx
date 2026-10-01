"use client";

import { useEffect, useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { describirRequisito, PATRON_USUARIO } from "@/lib/github/descripcion";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

export type GithubTaskProps = { id: string; enunciado?: string; repositorio?: string; requisitos: string[]; pistas: string[] };
type Respuesta = { aprobada: true } | { aprobada: false; problemas: string[]; reintentable: boolean };

const CLAVE_USUARIO = "syntaxerror:github-usuario";

function leerUsuario(): string {
  try {
    return localStorage.getItem(CLAVE_USUARIO) ?? "";
  } catch {
    return "";
  }
}

function guardarUsuario(usuario: string) {
  try {
    localStorage.setItem(CLAVE_USUARIO, usuario);
  } catch {
    // Sin almacenamiento solo se pierde el recordatorio del usuario.
  }
}

export function GithubTask({ id, enunciado, repositorio, requisitos, pistas }: GithubTaskProps) {
  const { caso, mision, tareaAprobada, registrarResultado } = useMision();
  const [usuario, setUsuario] = useState("");
  const [url, setUrl] = useState("");
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [revisando, setRevisando] = useState(false);
  useEffect(() => setUsuario(leerUsuario()), []);
  const usuarioValido = PATRON_USUARIO.test(usuario.trim());
  const destino = repositorio && usuarioValido ? `github.com/${repositorio.replaceAll("{usuario}", usuario.trim())}` : null;

  function avisar(diagnostico: string) {
    setProblemas([]);
    setResultado({ aprobada: false, diagnostico });
  }

  async function revisar() {
    setRevisando(true);
    try {
      if (repositorio) guardarUsuario(usuario.trim());
      const respuesta = await fetch("/api/github/revisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caso, mision, tarea: id, ...(repositorio ? { usuario: usuario.trim() } : { url: url.trim() }) }),
      });
      if (respuesta.status === 429) return avisar("Hiciste muchas revisiones seguidas. Espera unos minutos y vuelve a intentar.");
      if (respuesta.status === 400) {
        return avisar(repositorio ? "Escribe tu usuario de GitHub tal como aparece en tu perfil: letras, números y guiones." : "Pega el enlace de tu repositorio: https://github.com/tu-usuario/tu-repositorio");
      }
      if (!respuesta.ok) return avisar("No pudimos revisar ahora. Intenta de nuevo en unos minutos.");
      const datos = (await respuesta.json()) as Respuesta;
      if (datos.aprobada) {
        setProblemas([]);
        setResultado({ aprobada: true, diagnostico: null });
        registrarResultado(id, true);
        return;
      }
      // Si GitHub no respondió no es un intento fallido de la persona: no suma para las pistas.
      if (datos.reintentable) return avisar(datos.problemas[0]);
      setProblemas(datos.problemas);
      setResultado({ aprobada: false, diagnostico: datos.problemas.length === 1 ? datos.problemas[0] : `Revisamos tu repositorio y faltan ${datos.problemas.length} cosas:` });
      registrarResultado(id, false);
    } catch {
      avisar("No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setRevisando(false);
    }
  }

  return (
    <PanelTarea id={id} titulo="tarea en GitHub" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<Button type="button" disabled={revisando} onClick={() => void revisar()}>{revisando ? "Revisando…" : "Revisar en GitHub"}</Button>}>
      <div className="grid gap-2 text-sm">
        <p className="font-bold">Lo que vamos a revisar</p>
        <ul className="grid list-disc gap-1 pl-5 leading-6">{requisitos.map((requisito) => <li key={requisito}>{describirRequisito(requisito)}</li>)}</ul>
      </div>
      {repositorio ? (
        <label className="grid gap-1 text-sm font-bold">
          Tu usuario de GitHub
          <input value={usuario} onChange={(evento) => setUsuario(evento.target.value)} autoComplete="off" spellCheck={false} placeholder="ana-perez" className="field font-mono" />
          <span className="font-normal text-muted-foreground">{destino ? `Revisaremos ${destino}` : "Es el nombre que aparece en github.com/tu-usuario."}</span>
        </label>
      ) : (
        <label className="grid gap-1 text-sm font-bold">
          Enlace a tu repositorio
          <input value={url} onChange={(evento) => setUrl(evento.target.value)} autoComplete="off" spellCheck={false} placeholder="https://github.com/tu-usuario/tu-repositorio" className="field font-mono" />
        </label>
      )}
      {problemas.length > 1 ? (
        <ul aria-label="Lo que falta en tu repositorio" className="grid list-disc gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 pl-8 text-sm leading-6">
          {problemas.map((problema) => <li key={problema}>{problema}</li>)}
        </ul>
      ) : null}
    </PanelTarea>
  );
}
