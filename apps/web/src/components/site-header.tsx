import { GraduationCap, LayoutDashboard, Mail, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { auth } from "@/lib/auth";
import { contarNoLeidos } from "@/lib/mensajes";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";
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
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto flex items-center gap-2 font-black text-foreground">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground">
            {"{}"}
          </span>
          <span className="hidden sm:inline">syntaxError.cl</span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1" aria-label="Principal">
            <Link className="nav-link" href="/dashboard">
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link className="nav-link" href="/dashboard/mensajes" aria-label={noLeidos > 0 ? `Mensajes, ${noLeidos} sin leer` : "Mensajes"}>
              <Mail size={16} />
              <span className="hidden sm:inline">Mensajes</span>
              {noLeidos > 0 ? <span className="badge">{noLeidos}</span> : null}
            </Link>
            {actual && esDocente(actual) ? (
              <Link className="nav-link" href="/profesor">
                <GraduationCap size={16} />
                <span className="hidden sm:inline">Docencia</span>
              </Link>
            ) : null}
            {actual?.rol === "admin" ? (
              <Link className="nav-link" href="/admin">
                <Shield size={16} />
                <span className="hidden sm:inline">Administración</span>
              </Link>
            ) : null}
          </nav>
        ) : null}

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
                <strong className="block truncate text-sm">{user.name ?? "Estudiante"}</strong>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
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
