"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Un enlace del menú principal que se marca cuando estás en su sección. «exacto» para el panel,
// que es el prefijo de las demás secciones del alumno.
export function EnlaceNav({ href, exacto = false, children, ...resto }: { href: string; exacto?: boolean; children: ReactNode; "aria-label"?: string }) {
  const ruta = usePathname() ?? "";
  const actual = exacto ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);
  return (
    <Link className="nav-link" href={href} aria-current={actual ? "page" : undefined} {...resto}>
      {children}
    </Link>
  );
}
