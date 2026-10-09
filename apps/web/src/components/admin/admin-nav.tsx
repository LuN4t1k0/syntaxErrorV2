"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { href: "/admin", texto: "Resumen" },
  { href: "/admin/usuarios", texto: "Usuarios" },
  { href: "/admin/rutas", texto: "Rutas" },
  { href: "/admin/contenido", texto: "Contenido y métricas" },
  { href: "/admin/comunidad", texto: "Solicitudes y reseñas" },
  { href: "/admin/reportes", texto: "Reportes" },
  { href: "/profesor/entregables", texto: "Entregables" },
  { href: "/admin/preguntas", texto: "Preguntas" },
  { href: "/admin/tutor", texto: "Caché del tutor" },
  { href: "/admin/bitacora", texto: "Bitácora" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administración" className="admin-nav">
      <p className="admin-nav__label">{"> sudo admin"}</p>
      {SECCIONES.map(({ href, texto }) => {
        const actual =
          href === "/admin"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={actual ? "page" : undefined}
            className="admin-nav__link"
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
