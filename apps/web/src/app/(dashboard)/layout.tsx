import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SincronizarProgreso } from "@/components/sincronizar-progreso";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";
import { clasesFuentes } from "@/lib/fuentes";
import "@/components/panel/zona.css";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  // La zona del alumno habla la misma identidad visual que la portada (Obsidian Syntax).
  return (
    <div className={`zona-obsidiana ${clasesFuentes}`}>
      <SiteHeader />
      <SincronizarProgreso />
      {children}
      <SiteFooter estado />
    </div>
  );
}
