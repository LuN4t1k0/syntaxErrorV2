import Link from "next/link";
import type { ReactNode } from "react";

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

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[14rem_1fr] lg:px-8">
      <nav aria-label="Administración" className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
        <p className="w-full font-mono text-sm font-bold text-primary">{"> sudo admin"}</p>
        {SECCIONES.map((seccion) => (
          <Link key={seccion.href} href={seccion.href} className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-surface-raised hover:text-foreground">
            {seccion.texto}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
