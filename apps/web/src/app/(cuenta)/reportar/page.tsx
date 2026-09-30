import { redirect } from "next/navigation";
import { FormularioReporte } from "@/components/comunidad/formulario-reporte";
import { paginaValida } from "@/lib/reportes";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Reportar un problema" };
export const dynamic = "force-dynamic";

export default async function ReportarPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina: pedida } = await searchParams;
  const pagina = pedida && paginaValida(pedida) ? pedida : "/";
  if (!(await obtenerUsuarioId())) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/reportar?pagina=${encodeURIComponent(pagina)}`)}`);
  }
  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> git issue create"}</p>
      <h1 className="text-3xl font-black">Reportar un problema</h1>
      <p className="leading-7 text-muted-foreground">Cuéntanos qué falló o qué mejorarías. Lo lee el equipo de syntaxError.cl.</p>
      <FormularioReporte pagina={pagina} />
    </main>
  );
}
