import type { ReactNode } from "react";

export function PageIntro({
  comando,
  titulo,
  descripcion,
  children,
}: {
  comando: string;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro">
      <p className="page-intro__command">{comando}</p>
      <h1>{titulo}</h1>
      {descripcion ? (
        <p className="page-intro__description">{descripcion}</p>
      ) : null}
      {children}
    </header>
  );
}
