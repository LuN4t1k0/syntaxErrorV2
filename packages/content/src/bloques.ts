import { evaluate } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { TIPOS_BLOQUE } from "./esquemas";

export type BloqueCrudo = { tipo: string; props: Record<string, unknown>; texto: string | null };

export async function compilarMision(fuente: string): Promise<MDXContent> {
  // remark-gfm: tablas, tachado y listas de tareas de Markdown, que el MDX base no reconoce.
  const modulo = await evaluate(fuente, { ...runtime, remarkPlugins: [remarkGfm] });
  return modulo.default;
}

function textoPlano(nodo: ReactNode): string {
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoPlano).join(" ");
  if (isValidElement(nodo)) return textoPlano((nodo.props as { children?: ReactNode }).children);
  return "";
}

export async function extraerBloques(fuente: string): Promise<BloqueCrudo[]> {
  const Contenido = await compilarMision(fuente);
  const tipoPorMarcador = new Map<unknown, string>();
  const marcadores: Record<string, () => null> = {};
  for (const tipo of TIPOS_BLOQUE) {
    const marcador = () => null;
    marcadores[tipo] = marcador;
    tipoPorMarcador.set(marcador, tipo);
  }

  const bloques: BloqueCrudo[] = [];
  const recorrer = (nodo: ReactNode): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach(recorrer);
      return;
    }
    if (!isValidElement(nodo)) return;
    const { children, ...props } = nodo.props as Record<string, unknown> & { children?: ReactNode };
    const tipo = tipoPorMarcador.get(nodo.type);
    if (tipo) {
      const texto = children === undefined ? null : textoPlano(children).replace(/\s+/g, " ").trim();
      bloques.push({ tipo, props, texto });
    }
    recorrer(children);
  };

  recorrer(Contenido({ components: marcadores }));
  return bloques;
}
