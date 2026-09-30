import type { ReactNode } from "react";
import { MisionesHeader } from "@/components/misiones-header";
import { SincronizarProgreso } from "@/components/sincronizar-progreso";
import { SiteFooter } from "@/components/site-footer";

export default function MisionesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MisionesHeader />
      <SincronizarProgreso />
      {children}
      <SiteFooter />
    </>
  );
}
