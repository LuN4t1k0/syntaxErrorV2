import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import { hojaDeTarea, tablasSql } from "@syntaxerror/content/datos";
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
import { PythonEjemplo } from "./python-ejemplo";
import { PythonTask } from "./python-task";
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
      const { solucion: _solucion, ...resto } = bloqueSchemas.SheetTask.parse(props);
      const { grilla, opciones } = hojaDeTarea(caso, resto);
      const { hoja: _hoja, grilla: _grilla, otras: _otras, inicial: _inicial, ...tarea } = resto;
      return <SheetTask {...tarea} grilla={grilla} opciones={opciones} />;
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
  };
}
