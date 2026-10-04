"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { buscar, type EntradaBusqueda } from "@/lib/buscador/buscar";

export const ETIQUETAS: Record<EntradaBusqueda["tipo"], string> = { ruta: "Ruta", caso: "Caso", mision: "Misión", leccion: "Lección" };

export function Buscador({ indice }: { indice: EntradaBusqueda[] }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [consulta, setConsulta] = useState(parametros.get("q") ?? "");
  const resultados = useMemo(() => buscar(indice, consulta), [indice, consulta]);

  function cambiar(valor: string) {
    setConsulta(valor);
    router.replace(valor.trim() ? `/buscar?q=${encodeURIComponent(valor)}` : "/buscar", { scroll: false });
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">
        Busca rutas, casos, misiones o conceptos
        <input
          type="search"
          value={consulta}
          onChange={(evento) => cambiar(evento.target.value)}
          maxLength={100}
          autoFocus
          placeholder="Por ejemplo: WHERE, promedio o ventas"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-base font-normal text-foreground outline-none focus:border-primary"
        />
      </label>
      {consulta.trim() === "" ? null : resultados.length === 0 ? (
        <p role="status" className="text-muted-foreground">{`No encontramos resultados para «${consulta.trim()}».`}</p>
      ) : (
        <ul className="grid gap-3" aria-label="Resultados">
          {resultados.map((resultado) => (
            <li key={resultado.href}>
              <Link href={resultado.href} className="card grid gap-1 p-4 hover:border-primary">
                <span className="font-mono text-xs text-muted-foreground">{`${ETIQUETAS[resultado.tipo]} · ${resultado.contexto}`}</span>
                <span className="font-bold">{resultado.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
