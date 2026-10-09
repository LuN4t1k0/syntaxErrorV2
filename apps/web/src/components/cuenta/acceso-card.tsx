import type { ReactNode } from "react";
import { Card } from "@syntaxerror/ui/components/card";
import { SiteBrand } from "@/components/site-brand";
import { ThemeToggle } from "@/components/theme-toggle";

export function AccesoCard({
  titulo,
  descripcion,
  etiqueta,
  marca = true,
  children,
}: {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  marca?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      {marca ? (
        <div className="mb-8 flex items-center justify-between gap-3">
          <SiteBrand />
          <ThemeToggle />
        </div>
      ) : null}
      <Card className="p-6 sm:p-8">
        <div className="mb-7">
          <p className="section-kicker">{etiqueta}</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight">
            {titulo}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {descripcion}
          </p>
        </div>
        {children}
      </Card>
    </div>
  );
}
