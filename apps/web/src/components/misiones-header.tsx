import { LayoutDashboard, Route } from "lucide-react";
import { SiteBrand } from "./site-brand";
import { BusquedaRapida } from "./busqueda-rapida";
import { EnlaceNav } from "./enlace-nav";
import { ThemeToggle } from "./theme-toggle";

// Sin sesión ni base: las lecciones se generan estáticas. La sección activa la marca el navegador.
export function MisionesHeader() {
  return (
    <header className="site-header sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="site-header-inner">
        <div className="mr-auto shrink-0">
          <SiteBrand compact />
        </div>
        <nav className="flex items-center gap-1" aria-label="Principal">
          <BusquedaRapida />
          <EnlaceNav href="/rutas" aria-label="Rutas">
            <Route size={16} />
            <span className="hidden sm:inline">Rutas</span>
          </EnlaceNav>
          <EnlaceNav href="/dashboard" exacto aria-label="Tu panel">
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Tu panel</span>
          </EnlaceNav>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
