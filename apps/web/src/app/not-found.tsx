import { NotFoundGlitch } from "@/components/not-found-glitch";
import { SiteFooter } from "@/components/site-footer";
import { MisionesHeader } from "@/components/misiones-header";

export default function NotFound() {
  return (
    <>
      <MisionesHeader />
      <NotFoundGlitch
        eyebrow="ERROR_404"
        title="Esta ruta no existe."
        description="El enlace puede haber cambiado o la página todavía no está disponible en esta fase."
        primaryHref="/"
        primaryLabel="Volver al inicio"
      />
      <SiteFooter />
    </>
  );
}
