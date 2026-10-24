import { SiteBrand } from "./site-brand";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Route,
  Shield,
  SquareTerminal,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { auth } from "@/lib/auth";
import { contarNoLeidos } from "@/lib/mensajes";
import { obtenerNivel } from "@/lib/puntos/servicio";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { BusquedaRapida } from "./busqueda-rapida";
import { EnlaceNav } from "./enlace-nav";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  // Rol y mensajes se leen desde la base: el JWT no se entera de un cambio de rol.
  const actual = user ? await obtenerUsuarioActual() : null;
  const noLeidos = actual ? await contarNoLeidos(getDb(), actual.id) : 0;
  const nivel = actual ? await obtenerNivel(getDb(), actual.id) : null;
  const initials = (user?.name ?? user?.email ?? "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="site-header sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="site-header-inner">
        <div className="mr-auto shrink-0">
          <SiteBrand compact />
        </div>

        {user ? (
          <nav className="site-header-nav" aria-label="Principal">
            <EnlaceNav href="/dashboard" exacto aria-label="Tu panel">
              <LayoutDashboard size={16} />
              <span className="hidden xl:inline">Tu panel</span>
            </EnlaceNav>
            <EnlaceNav href="/rutas" aria-label="Rutas de aprendizaje">
              <Route size={16} />
              <span className="hidden xl:inline">Rutas</span>
            </EnlaceNav>
            <EnlaceNav href="/dashboard/clases" aria-label="Casos y clases">
              <BookOpen size={16} />
              <span className="hidden xl:inline">Casos</span>
            </EnlaceNav>
            <EnlaceNav
              href="/dashboard/mensajes"
              aria-label={
                noLeidos > 0 ? `Mensajes, ${noLeidos} sin leer` : "Mensajes"
              }
            >
              <Mail size={16} />
              <span className="hidden xl:inline">Mensajes</span>
              {noLeidos > 0 ? <span className="badge">{noLeidos}</span> : null}
            </EnlaceNav>
            {actual && esDocente(actual) ? (
              <EnlaceNav href="/profesor" aria-label="Docencia">
                <GraduationCap size={16} />
                <span className="hidden xl:inline">Docencia</span>
              </EnlaceNav>
            ) : null}
            {actual?.rol === "admin" ? (
              <EnlaceNav href="/admin" aria-label="Administración">
                <Shield size={16} />
                <span className="hidden xl:inline">Admin</span>
              </EnlaceNav>
            ) : null}
          </nav>
        ) : null}

        <div className="site-header-utilidades">
          {/* El mensaje del creador de la plataforma, con el mismo enlace que tenía la v1. */}
          <Link className="nav-link" href="/lun4t1k0" aria-label="El origen" title="> sudo ./run_bio">
            <SquareTerminal size={16} />
          </Link>
          <BusquedaRapida />
          {user ? (
            <Link className="nav-link" href="/dashboard/avance" aria-label="Tu avance" title="Tu avance">
              <Trophy size={16} />
            </Link>
          ) : null}
          <ThemeToggle />
        </div>

        {user ? (
          <details className="relative">
            <summary className="site-header-perfil" aria-label="Abrir menú de perfil">
              <span className="site-header-avatar">{initials}</span>
              {nivel ? (
                <span className="site-header-nivel hidden xl:grid" aria-hidden="true">
                  <strong>{(user.name ?? "Estudiante").split(/\s+/)[0]}</strong>
                  <small>{`Nivel ${nivel.nivel} · ${nivel.puntos} XP`}</small>
                </span>
              ) : null}
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
