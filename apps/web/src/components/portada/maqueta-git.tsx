"use client";

import { Cursor, useEscritura, VentanaMaqueta } from "./ventana-maqueta";

// Caso 0: el primer repositorio, del git init al push.
const LINEAS: { texto: string; comando?: boolean }[] = [
  { texto: "git init portafolio", comando: true },
  { texto: "Initialized empty Git repository in ~/portafolio/.git/" },
  { texto: "git add README.md", comando: true },
  { texto: 'git commit -m "docs: mi primer README"', comando: true },
  { texto: "[main (root-commit) e763497] docs: mi primer README" },
  { texto: " 1 file changed, 12 insertions(+)" },
  { texto: "git push -u origin main", comando: true },
  { texto: " * [new branch]      main -> main" },
];

export function MaquetaGit() {
  const visibles = useEscritura(LINEAS.length + 1, 450);
  const listo = visibles > LINEAS.length;
  return (
    <VentanaMaqueta archivo="terminal" lateral={{ titulo: "Caso 0", items: ["Tu primer repositorio", "Archivos y commits", "Escribe un buen README", "Tu perfil de GitHub"], activo: 0 }}>
      <p className="font-mono text-xs font-bold uppercase text-primary">Herramientas del oficio</p>
      <p className="mt-1 font-black">Tu primer repositorio</p>
      <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 sm:text-sm">
        {LINEAS.slice(0, visibles).map((linea, indice) => (
          <span key={indice} className="block">
            {linea.comando ? (
              <>
                <span className="text-primary">$ </span>
                <span className="text-foreground">{linea.texto}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{linea.texto}</span>
            )}
          </span>
        ))}
        <span className="text-primary">$ </span>
        <Cursor listo={listo} />
      </pre>
      <p className={`mt-4 font-mono text-sm font-bold transition-opacity duration-300 ${listo ? "opacity-100" : "opacity-0"}`}>✔ Misión aprobada: el repositorio está en GitHub.</p>
    </VentanaMaqueta>
  );
}
