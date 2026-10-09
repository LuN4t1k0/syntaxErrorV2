import { redirect } from "next/navigation";
import { FormularioReporte } from "@/components/comunidad/formulario-reporte";
import { paginaValida } from "@/lib/reportes";
import { obtenerUsuarioId } from "@/lib/sesion";
import { PageIntro } from "@/components/page-intro";

export const metadata = { title: "Reportar un problema" };
export const dynamic = "force-dynamic";

export default async function ReportarPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { pagina: pedida } = await searchParams;
  const pagina = pedida && paginaValida(pedida) ? pedida : "/";
  if (!(await obtenerUsuarioId())) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/reportar?pagina=${encodeURIComponent(pagina)}`)}`,
    );
  }
  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-12 sm:px-6">
      <PageIntro
        comando="> git issue create"
        titulo="Reportar un problema"
        descripcion="Cuéntanos qué falló o qué mejorarías. Lo lee el equipo de syntaxError.cl."
      />
      <section className="card p-5 sm:p-6" aria-label="Nuevo reporte">
        <FormularioReporte pagina={pagina} />
      </section>
    </main>
  );
}
