import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function MisionesHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto flex items-center gap-2 font-black text-foreground">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground">{"{}"}</span>
          <span className="hidden sm:inline">syntaxError.cl</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Principal">
          <Link className="nav-link" href="/buscar">Buscar</Link>
          <Link className="nav-link" href="/rutas">Rutas</Link>
          <Link className="nav-link" href="/dashboard">Tu panel</Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
