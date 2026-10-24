import type { ReactNode } from "react";
import { MisionesHeader } from "@/components/misiones-header";
import { SincronizarProgreso } from "@/components/sincronizar-progreso";
import { SiteFooter } from "@/components/site-footer";
import { clasesFuentes } from "@/lib/fuentes";
import "@/components/panel/zona.css";

// Rutas, casos y lecciones hablan la misma identidad visual que el panel y la portada (Obsidian Syntax).
export default function MisionesLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`zona-obsidiana ${clasesFuentes}`}>
      <MisionesHeader />
      <SincronizarProgreso />
      {children}
      <SiteFooter />
    </div>
  );
}
