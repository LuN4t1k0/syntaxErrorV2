import Link from "next/link";
import { EnlaceReportar } from "./comunidad/enlace-reportar";
import { EstadoSistema } from "./estado-sistema";

// «estado» muestra la salud de la plataforma: solo en el panel, donde el alumno trabaja.
export function SiteFooter({ estado = false }: { estado?: boolean }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {estado ? <EstadoSistema /> : null}
          <p>© {new Date().getFullYear()} syntaxError.cl</p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Pie de página">
          <Link href="/nosotros" className="hover:text-foreground">
            Por qué existimos
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos
          </Link>
          <EnlaceReportar />
        </nav>
      </div>
    </footer>
  );
}
