import type { MDXComponents } from "mdx/types";
import { isValidElement, type ReactNode } from "react";
import { celdasConFormula, hojaDeTarea, tablasSql } from "@syntaxerror/content/datos";
import { bloqueSchemas } from "@syntaxerror/content/esquemas";
import type { Caso } from "@syntaxerror/content/tipos";
import { calcularEsperado } from "@syntaxerror/engines/sql";
import { CodigoResaltado } from "@/components/consola/codigo-resaltado";
import { unidad } from "@/lib/unidad";
import { Brief, Concepto } from "./bloques";
import { Debrief } from "./debrief";
import { Decision } from "./decision";
import { GithubTask } from "./github-task";
import { LecturaTask } from "./lectura-task";
import { MarkdownTask } from "./markdown-task";
import { PlanillaEjemplo } from "./planilla-ejemplo";
import { PythonEjemplo } from "./python-ejemplo";
import { PythonTask } from "./python-task";
import { QuizTask } from "./quiz-task";
import { SheetTask } from "./sheet-task";
import { SqlEjemplo } from "./sql-ejemplo";
import { SqlTask } from "./sql-task";

type PropsMdx = Record<string, unknown> & { children?: ReactNode };

export function componentesMision(caso: Caso): MDXComponents {
  const tablas = tablasSql(caso);
  return {
    Brief: ({ children, ...props }: PropsMdx) => <Brief {...bloqueSchemas.Brief.parse(props)}>{children}</Brief>,
    Concepto: ({ children }: PropsMdx) => <Concepto>{children}</Concepto>,
    SqlEjemplo: (props: PropsMdx) => {
      const ejemplo = bloqueSchemas.SqlEjemplo.parse(props);
      return <SqlEjemplo {...ejemplo} tablas={tablas} resaltado={<CodigoResaltado codigo={ejemplo.consulta} lenguaje="sql" />} />;
    },
    PythonEjemplo: (props: PropsMdx) => {
      const ejemplo = bloqueSchemas.PythonEjemplo.parse(props);
      return <PythonEjemplo {...ejemplo} resaltado={<CodigoResaltado codigo={ejemplo.codigo} lenguaje="python" />} />;
    },
    SqlTask: (props: PropsMdx) => {
      const { solucion, ...tarea } = bloqueSchemas.SqlTask.parse(props);
      const esperadas = calcularEsperado(tablas, { solucion, comparar: tarea.comparar, verificar: tarea.verificar });
      return <SqlTask {...tarea} esperadas={esperadas} tablas={tablas} />;
    },
    SheetTask: (props: PropsMdx) => {
      const { solucion, ...resto } = bloqueSchemas.SheetTask.parse(props);
      const { grilla, opciones } = hojaDeTarea(caso, resto);
      const { hoja: _hoja, grilla: _grilla, otras: _otras, inicial: _inicial, ...tarea } = resto;
      return <SheetTask {...tarea} celdas={celdasConFormula({ celdas: tarea.celdas, solucion })} grilla={grilla} opciones={opciones} />;
    },
    PythonTask: (props: PropsMdx) => {
      const { solucion: _solucion, paquetes: _paquetes, ...tarea } = bloqueSchemas.PythonTask.parse(props);
      return <PythonTask {...tarea} />;
    },
    MarkdownTask: (props: PropsMdx) => {
      const { solucion: _solucion, ...tarea } = bloqueSchemas.MarkdownTask.parse(props);
      return <MarkdownTask {...tarea} />;
    },
    GithubTask: (props: PropsMdx) => <GithubTask {...bloqueSchemas.GithubTask.parse(props)} />,
    QuizTask: (props: PropsMdx) => <QuizTask {...bloqueSchemas.QuizTask.parse(props)} />,
    LecturaTask: (props: PropsMdx) => {
      const { pistas: _pistas, ...tarea } = bloqueSchemas.LecturaTask.parse(props);
      return <LecturaTask {...tarea} />;
    },
    Decision: (props: PropsMdx) => <Decision {...bloqueSchemas.Decision.parse(props)} />,
    Debrief: ({ children, ...props }: PropsMdx) => (
      <Debrief {...bloqueSchemas.Debrief.parse(props)} unidad={unidad(caso.tipo)}>
        {children}
      </Debrief>
    ),
    Sintaxis: (props: PropsMdx) => {
      const { codigo, lenguaje } = bloqueSchemas.Sintaxis.parse(props);
      return (
        <figure className="grid gap-2 rounded-md border border-dashed border-border p-4">
          <figcaption className="font-mono text-xs font-bold uppercase text-muted-foreground">Sintaxis</figcaption>
          {/* Las fórmulas de planilla no tienen resaltado: se muestran tal cual. */}
          {lenguaje === "planilla" ? <pre className="overflow-x-auto font-mono text-sm leading-6">{codigo}</pre> : <CodigoResaltado codigo={codigo} lenguaje={lenguaje} />}
        </figure>
      );
    },
    Planilla: ({ children, ...props }: PropsMdx) => <PlanillaEjemplo {...bloqueSchemas.Planilla.parse(props)}>{children}</PlanillaEjemplo>,
    // Listas y enlaces de Markdown: Tailwind les quita las viñetas, los números y el color por defecto.
    ul: ({ children }: PropsMdx) => <ul className="grid list-disc gap-1 pl-6">{children}</ul>,
    ol: ({ children }: PropsMdx) => <ol className="grid list-decimal gap-1 pl-6">{children}</ol>,
    a: ({ children, href }: PropsMdx) => <a href={typeof href === "string" ? href : undefined} className="text-accent underline underline-offset-2 hover:text-primary-hover">{children}</a>,
    // Las tablas de Markdown: con borde y desplazamiento horizontal en pantallas angostas.
    table: ({ children }: PropsMdx) => (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    ),
    th: ({ children }: PropsMdx) => <th className="bg-surface-raised px-3 py-2 font-bold">{children}</th>,
    td: ({ children }: PropsMdx) => <td className="border-t border-border px-3 py-2 align-top">{children}</td>,
    // El código en línea (`precio * stock`). Dentro de un bloque ``` lo reemplaza el pre de abajo.
    code: ({ children, className }: PropsMdx) => <code className={className ? String(className) : "rounded bg-surface-raised px-1 py-0.5 font-mono text-[0.9em]"}>{children}</code>,
    // Los bloques ``` del MDX: con resaltado si son de Python o SQL; los de ```text o sin lenguaje, tal cual.
    pre: ({ children }: PropsMdx) => {
      const codigo = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children.props : null;
      const lenguaje = /language-(\w+)/.exec(codigo?.className ?? "")?.[1];
      const texto = typeof codigo?.children === "string" ? codigo.children.replace(/\n$/, "") : null;
      return (
        <div className="rounded-md border border-border bg-surface-raised p-4">
          {texto !== null && (lenguaje === "python" || lenguaje === "sql") ? <CodigoResaltado codigo={texto} lenguaje={lenguaje} /> : <pre className="overflow-x-auto font-mono text-sm leading-6">{codigo?.children ?? children}</pre>}
        </div>
      );
    },
  };
}
