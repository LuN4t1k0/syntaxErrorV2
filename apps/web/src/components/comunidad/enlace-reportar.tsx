"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Lleva la página actual para que el reporte diga desde dónde se envió. Funciona en páginas estáticas.
export function EnlaceReportar() {
  const pathname = usePathname();
  return (
    <Link href={`/reportar?pagina=${encodeURIComponent(pathname || "/")}`} className="hover:text-foreground">
      Reportar un problema
    </Link>
  );
}
