import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { FormularioReporteAdmin } from "@/components/admin/formulario-reporte-admin";
import { Paginacion } from "@/components/admin/paginacion";
import { adminDePagina } from "@/lib/admin/acceso";
import { listarReportes } from "@/lib/admin/moderacion";
import { leerPagina } from "@/lib/admin/paginacion";

export const metadata = { title: "Reportes · Administración" };
const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

export default async function ReportesAdminPage({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  await adminDePagina("/admin/reportes");
  const parametros = await searchParams;
  const estado = parametros.estado === "resuelto" ? "resuelto" : "pendiente";
  const resultado = await listarReportes(getDb(), { estado, pagina: leerPagina(parametros.pagina) });
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl font-black">Reportes</h1>
      <nav className="flex gap-4 text-sm font-bold" aria-label="Estado"><Link className={estado === "pendiente" ? "text-foreground" : "text-primary hover:underline"} href="/admin/reportes">Pendientes</Link><Link className={estado === "resuelto" ? "text-foreground" : "text-primary hover:underline"} href="/admin/reportes?estado=resuelto">Resueltos</Link></nav>
      {resultado.filas.length === 0 ? <p className="text-muted-foreground">No hay reportes.</p> : <ul className="grid gap-3">{resultado.filas.map((reporte) => <li key={reporte.id} className="card grid gap-3 p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="badge">{reporte.tipo === "error" ? "Error" : "Sugerencia"}</span><span className="text-muted-foreground">{`${reporte.autor.nombre ?? reporte.autor.email} · ${fecha(reporte.creadoEn)}`}</span></div><p className="text-sm">Página: <Link className="font-mono text-primary hover:underline" href={reporte.pagina}>{reporte.pagina}</Link></p><p className="whitespace-pre-wrap leading-7">{reporte.descripcion}</p>{reporte.estado === "pendiente" ? <FormularioReporteAdmin reporteId={reporte.id} esError={reporte.tipo === "error"} /> : <p className="text-xs text-muted-foreground">{reporte.resueltoEn ? `Resuelto el ${fecha(reporte.resueltoEn)}` : "Resuelto"}</p>}</li>)}</ul>}
      <Paginacion ruta="/admin/reportes" parametros={estado === "resuelto" ? { estado } : {}} pagina={resultado.pagina} paginas={resultado.paginas} />
    </main>
  );
}
