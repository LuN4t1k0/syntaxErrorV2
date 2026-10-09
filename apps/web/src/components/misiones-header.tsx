import { SiteBrand } from "./site-brand";
import Link from "next/link";
import { BusquedaRapida } from "./busqueda-rapida";
import { ThemeToggle } from "./theme-toggle";

export function MisionesHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="site-header-inner">
        <div className="mr-auto shrink-0">
          <SiteBrand compact />
        </div>
        <nav className="flex items-center gap-1" aria-label="Principal">
          <BusquedaRapida />
          <Link className="nav-link" href="/rutas">
            Rutas
          </Link>
          <Link className="nav-link" href="/dashboard" aria-label="Tu panel">
            Tu panel
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
