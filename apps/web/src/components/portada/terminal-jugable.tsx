"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ErrorExplicado } from "@syntaxerror/engines/consola";
import type { Fila } from "@syntaxerror/engines/tipos";
import {
  CONSULTA_INICIAL,
  VENTAS,
  interpretarTerminalPortada,
  salidaSqlExitosa,
  type LineaPortada,
  type RutaTerminalPortada,
} from "@/lib/portada/terminal";

type BloqueSalida =
  | { tipo: "lineas"; lineas: LineaPortada[] }
  | { tipo: "tabla"; filas: Fila[] }
  | { tipo: "error"; error: ErrorExplicado };

export function TerminalJugable({ rutas }: { rutas: RutaTerminalPortada[] }) {
  const router = useRouter();
  const [consulta, setConsulta] = useState(CONSULTA_INICIAL);
  const [salida, setSalida] = useState<BloqueSalida[]>([
    { tipo: "lineas", lineas: [{ texto: "# tu primer reto: ¿cuánto vendió cada comuna?", tipo: "muted" }] },
  ]);
  const [ejecucionesCorrectas, setEjecucionesCorrectas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const tablas = useMemo(() => ({ ventas: VENTAS }), []);

  async function ejecutar(entrada = consulta) {
    const accion = interpretarTerminalPortada(entrada, rutas);
    if (accion.tipo === "navegar") {
      router.push(accion.href);
      return;
    }
    if (accion.tipo === "clear") {
      setSalida([]);
      return;
    }
    if (accion.tipo === "reset") {
      setConsulta(accion.consulta);
      setSalida([{ tipo: "lineas", lineas: accion.lineas }]);
      return;
    }
    if (accion.tipo === "lineas") {
      setSalida((actual) => [...actual, { tipo: "lineas", lineas: [{ texto: `sql> ${entrada}`, tipo: "muted" }, ...accion.lineas] }]);
      return;
    }

    setCargando(true);
    setSalida((actual) => [...actual, { tipo: "lineas", lineas: [{ texto: `sql> ${entrada}`, tipo: "muted" }, { texto: "cargando motor sql...", tipo: "muted" }] }]);
    try {
      const [{ crearBaseSql, ejecutarSql }, { explicarErrorSql }] = await Promise.all([
        import("@syntaxerror/engines/sql"),
        import("@syntaxerror/engines/sql-errores"),
      ]);
      const filas = ejecutarSql(crearBaseSql(tablas), accion.consulta);
      const invitacion = salidaSqlExitosa(filas, ejecucionesCorrectas > 0);
      setSalida((actual) => [...actual.slice(0, -1), { tipo: "lineas", lineas: [{ texto: `sql> ${entrada}`, tipo: "muted" }] }, { tipo: "tabla", filas }, { tipo: "lineas", lineas: invitacion }]);
      setEjecucionesCorrectas((valor) => valor + 1);
    } catch (error) {
      const [{ explicarErrorSql }] = await Promise.all([import("@syntaxerror/engines/sql-errores")]);
      const original = error instanceof Error ? error.message : String(error);
      setSalida((actual) => [...actual.slice(0, -1), { tipo: "lineas", lineas: [{ texto: `sql> ${entrada}`, tipo: "muted" }] }, { tipo: "error", error: explicarErrorSql(accion.consulta, original, tablas) }]);
    } finally {
      setCargando(false);
    }
  }

  function atajo(texto: string) {
    if (texto === "↵ ejecutar") void ejecutar();
    else void ejecutar(texto);
  }

  return (
    <section aria-label="Terminal de prueba" className="landing-terminal">
      <div className="landing-terminal__bar">
        <i />
        <i />
        <i />
        <span>invitado@syntaxerror.cl: ~/reto</span>
      </div>
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-2 font-mono text-sm">
          <p className="text-muted-foreground"># tu primer reto: ¿cuánto vendió cada comuna?</p>
          <label className="grid gap-2">
            <span className="sr-only">Consulta SQL</span>
            <span className="flex min-w-0 items-start gap-2 rounded border border-border bg-background/65 px-3 py-2">
              <span className="shrink-0 font-bold text-primary">sql&gt;</span>
              <textarea
                value={consulta}
                onChange={(evento) => setConsulta(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter" && !evento.shiftKey) {
                    evento.preventDefault();
                    void ejecutar();
                  }
                }}
                rows={3}
                spellCheck={false}
                autoCapitalize="off"
                className="min-h-20 flex-1 resize-none bg-transparent leading-6 outline-none"
              />
            </span>
          </label>
          <p className="text-xs text-muted-foreground">Enter para ejecutar · escribe help para ver comandos</p>
        </div>

        <div className="grid gap-2">
          <p className="font-mono text-xs font-bold text-primary">$ head ventas</p>
          <Tabla filas={VENTAS} />
        </div>

        <div aria-live="polite" className="grid gap-3 font-mono text-sm">
          {salida.map((bloque, indice) => (
            <Salida key={indice} bloque={bloque} />
          ))}
        </div>

        {ejecucionesCorrectas > 0 ? (
          <button type="button" className="btn btn-primary w-fit" onClick={() => router.push("/registro")}>
            ./start
          </button>
        ) : null}

        <div className="flex flex-wrap gap-2 sm:hidden">
          {["↵ ejecutar", "help", "ls rutas", "./start"].map((texto) => (
            <button key={texto} type="button" className="rounded border border-border px-3 py-2 font-mono text-xs font-bold text-primary" onClick={() => atajo(texto)} disabled={cargando}>
              {texto}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Salida({ bloque }: { bloque: BloqueSalida }) {
  if (bloque.tipo === "tabla") return <Tabla filas={bloque.filas} />;
  if (bloque.tipo === "error") {
    return (
      <div role="alert" className="rounded border border-destructive/45 bg-destructive/10 p-3 text-error-text">
        <p>{bloque.error.linea ? `Línea ${bloque.error.linea}: ${bloque.error.mensaje}` : bloque.error.mensaje}</p>
        {bloque.error.sugerencia ? <p className="mt-1 text-muted-foreground">{bloque.error.sugerencia}</p> : null}
      </div>
    );
  }
  return (
    <div className="grid gap-1">
      {bloque.lineas.map((linea, indice) => (
        <p key={indice} className={claseLinea(linea)}>
          {linea.texto}
        </p>
      ))}
    </div>
  );
}

function Tabla({ filas }: { filas: Fila[] }) {
  const columnas = Object.keys(filas[0] ?? {});
  if (columnas.length === 0) return <p className="font-mono text-sm text-muted-foreground">(sin filas)</p>;
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full min-w-[24rem] text-left font-mono text-xs">
        <thead className="bg-surface-raised text-muted-foreground">
          <tr>{columnas.map((columna) => <th key={columna} className="px-3 py-2">{columna}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map((fila, indice) => (
            <tr key={indice} className="border-t border-border">
              {columnas.map((columna) => <td key={columna} className="px-3 py-2">{formatear(fila[columna])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatear(valor: unknown): string {
  if (typeof valor === "number") return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor);
  return String(valor);
}

function claseLinea(linea: LineaPortada): string {
  if (linea.tipo === "error") return "text-error-text";
  if (linea.tipo === "ok") return "text-emerald-500";
  if (linea.tipo === "muted") return "text-muted-foreground";
  return "";
}
