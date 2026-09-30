import type { ReactNode } from "react";
import { MisionesHeader } from "@/components/misiones-header";
import { SiteFooter } from "@/components/site-footer";

export default function CuentaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MisionesHeader />
      {children}
      <SiteFooter />
    </>
  );
}
