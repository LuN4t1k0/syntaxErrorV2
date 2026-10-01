"use client";

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { sql, StandardSQL } from "@codemirror/lang-sql";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, drawSelection, EditorView, highlightActiveLine, hoverTooltip, keymap, lineNumbers, type DecorationSet } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { useEffect, useId, useRef } from "react";
import type { ErrorExplicado } from "@syntaxerror/engines/consola";
import type { Completado } from "@/lib/consola/completado";
import { explicarPalabra, type Lenguaje } from "@/lib/consola/glosario";

export type PropsEditor = {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  filas: number;
  lenguaje: Lenguaje;
  completar: (texto: string, posicion: number) => Completado | null;
  error: ErrorExplicado | null;
  deshabilitado: boolean;
};

const marcarError = StateEffect.define<number | null>();

// La línea del último error queda marcada hasta que la persona cambia el código.
const lineaConError = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(marcas, transaccion) {
    for (const efecto of transaccion.effects) {
      if (!efecto.is(marcarError)) continue;
      const numero = efecto.value;
      if (numero === null || numero < 1 || numero > transaccion.state.doc.lines) return Decoration.none;
      return Decoration.set([Decoration.line({ class: "cm-linea-error" }).range(transaccion.state.doc.line(numero).from)]);
    }
    return transaccion.docChanged ? Decoration.none : marcas;
  },
  provide: (campo) => EditorView.decorations.from(campo),
});

function glosarioAlPasar(lenguaje: Lenguaje) {
  return hoverTooltip((vista, posicion) => {
    const entrada = explicarPalabra(lenguaje, vista.state.doc.toString(), posicion);
    if (!entrada) return null;
    return {
      pos: entrada.desde,
      end: entrada.hasta,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "consola-glosario";
        const titulo = document.createElement("p");
        titulo.className = "consola-glosario-titulo";
        titulo.textContent = entrada.titulo;
        const explicacion = document.createElement("p");
        explicacion.textContent = entrada.explicacion;
        const ejemplo = document.createElement("code");
        ejemplo.textContent = entrada.ejemplo;
        dom.append(titulo, explicacion, ejemplo);
        return { dom };
      },
    };
  });
}

const tema = EditorView.theme({
  "&": { backgroundColor: "var(--background)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.875rem" },
  "&.cm-focused": { outline: "2px solid var(--focus-ring)", outlineOffset: "1px" },
  ".cm-content": { fontFamily: "var(--font-mono)", padding: "0.75rem 0", caretColor: "var(--foreground)" },
  ".cm-gutters": { backgroundColor: "var(--surface)", color: "var(--muted-foreground)", border: "none", borderRight: "1px solid var(--border)", borderRadius: "0.5rem 0 0 0.5rem" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--primary) 7%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--primary) 28%, transparent)", outline: "none" },
  ".cm-tooltip": { backgroundColor: "var(--surface-raised)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: "0.5rem" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--primary)", color: "var(--primary-foreground)" },
  ".cm-completionDetail": { fontStyle: "normal", opacity: "0.8", marginLeft: "0.75rem" },
  ".cm-completionInfo": { maxWidth: "20rem", padding: "0.5rem 0.75rem", lineHeight: "1.5" },
});

const soloLectura = (deshabilitado: boolean) => [EditorView.editable.of(!deshabilitado), EditorState.readOnly.of(deshabilitado)];

export function EditorCodeMirror({ etiqueta, valor, onCambio, filas, lenguaje, completar, error, deshabilitado }: PropsEditor) {
  const contenedor = useRef<HTMLDivElement>(null);
  const vista = useRef<EditorView | null>(null);
  const cambio = useRef(onCambio);
  const completado = useRef(completar);
  const modo = useRef(new Compartment());
  const idAyuda = useId();
  cambio.current = onCambio;
  completado.current = completar;

  useEffect(() => {
    if (!contenedor.current) return;
    const editor = new EditorView({
      parent: contenedor.current,
      state: EditorState.create({
        doc: valor,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          lenguaje === "sql" ? sql({ dialect: StandardSQL, upperCaseKeywords: true }) : python(),
          syntaxHighlighting(classHighlighter),
          autocompletion({
            override: [
              (contexto) => {
                const resultado = completado.current(contexto.state.doc.toString(), contexto.pos);
                return resultado ? { from: resultado.desde, options: resultado.opciones, validFor: /^[\w./-]*$/ } : null;
              },
            ],
          }),
          glosarioAlPasar(lenguaje),
          lineaConError,
          keymap.of([...closeBracketsKeymap, ...completionKeymap, ...historyKeymap, ...defaultKeymap, indentWithTab]),
          EditorView.updateListener.of((actualizacion) => {
            if (actualizacion.docChanged) cambio.current(actualizacion.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ "aria-label": etiqueta, "aria-describedby": idAyuda }),
          EditorView.theme({ ".cm-content, .cm-gutter": { minHeight: `${filas * 1.5 + 1.5}rem` } }),
          tema,
          modo.current.of(soloLectura(deshabilitado)),
        ],
      }),
    });
    vista.current = editor;
    return () => {
      editor.destroy();
      vista.current = null;
    };
    // El editor se crea una vez por lenguaje; el texto y el modo se sincronizan en los efectos de abajo.
  }, [lenguaje, etiqueta, filas, idAyuda]);

  useEffect(() => {
    const editor = vista.current;
    if (!editor || editor.state.doc.toString() === valor) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: valor } });
  }, [valor]);

  useEffect(() => {
    vista.current?.dispatch({ effects: modo.current.reconfigure(soloLectura(deshabilitado)) });
  }, [deshabilitado]);

  useEffect(() => {
    vista.current?.dispatch({ effects: marcarError.of(error?.linea ?? null) });
  }, [error]);

  return (
    <div className="grid gap-2 text-sm">
      <span aria-hidden="true" className="font-bold">{etiqueta}</span>
      <div ref={contenedor} />
      <p id={idAyuda} className="text-xs text-muted-foreground">
        Ctrl+Espacio muestra sugerencias. Tab agrega sangría; para salir del editor con el teclado, presiona Esc y luego Tab.
      </p>
    </div>
  );
}
