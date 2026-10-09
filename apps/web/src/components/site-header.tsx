import { SiteBrand } from "./site-brand";
import {
  GraduationCap,
  LayoutDashboard,
  Mail,
  Shield,
  SquareTerminal,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { auth } from "@/lib/auth";
import { contarNoLeidos } from "@/lib/mensajes";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { BusquedaRapida } from "./busqueda-rapida";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  // Rol y mensajes se leen desde la base: el JWT no se entera de un cambio de rol.
  const actual = user ? await obtenerUsuarioActual() : null;
  const noLeidos = actual ? await contarNoLeidos(getDb(), actual.id) : 0;
  const initials = (user?.name ?? user?.email ?? "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="site-header-inner">
        <div className="mr-auto shrink-0">
          <SiteBrand compact />
        </div>

        {user ? (
          <nav className="site-header-nav" aria-label="Principal">
            <Link className="nav-link" href="/dashboard" aria-label="Tu panel">
              <LayoutDashboard size={16} />
              <span className="hidden lg:inline">Tu panel</span>
            </Link>
            <Link
              className="nav-link"
              href="/dashboard/mensajes"
              aria-label={
                noLeidos > 0 ? `Mensajes, ${noLeidos} sin leer` : "Mensajes"
              }
            >
              <Mail size={16} />
              <span className="hidden lg:inline">Mensajes</span>
              {noLeidos > 0 ? <span className="badge">{noLeidos}</span> : null}
            </Link>
            {actual && esDocente(actual) ? (
              <Link className="nav-link" href="/profesor" aria-label="Docencia">
                <GraduationCap size={16} />
                <span className="hidden lg:inline">Docencia</span>
              </Link>
            ) : null}
            {actual?.rol === "admin" ? (
              <Link
                className="nav-link"
                href="/admin"
                aria-label="Administración"
              >
                <Shield size={16} />
                <span className="hidden lg:inline">Administración</span>
              </Link>
            ) : null}
          </nav>
        ) : null}

        {/* El mensaje del creador de la plataforma, con el mismo enlace que tenía la v1. */}
        <Link className="nav-link" href="/lun4t1k0" aria-label="El origen">
          <SquareTerminal size={16} />
          <span className="hidden font-mono xl:inline">
            {"> sudo ./run_bio"}
          </span>
        </Link>
        <BusquedaRapida />
        <ThemeToggle />

        {user ? (
          <details className="relative">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground"
              aria-label="Abrir menú de perfil"
            >
              {initials}
            </summary>
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-2xl">
              <div className="border-b border-border px-3 py-3">
                <strong className="block truncate text-sm">
                  {user.name ?? "Estudiante"}
                </strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <Link
                href="/perfil"
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-surface-raised hover:text-foreground"
              >
                <UserRound size={15} />
                Perfil
              </Link>
              <SignOutButton />
            </div>
          </details>
        ) : (
          <Link href="/login" className="btn btn-primary">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
