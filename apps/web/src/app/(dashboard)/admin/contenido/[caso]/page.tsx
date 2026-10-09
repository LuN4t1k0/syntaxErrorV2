import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { adminDePagina } from "@/lib/admin/acceso";
import { DIAS_ABANDONO, metricasDeCaso } from "@/lib/admin/metricas";

export const metadata = { title: "Métricas del caso · Administración" };
const porcentaje = (valor: number) => `${Math.round(valor * 100)}%`;

export default async function MetricasCasoPage({ params }: { params: Promise<{ caso: string }> }) {
  const { caso: slug } = await params;
  await adminDePagina(`/admin/contenido/${slug}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  const metricas = await metricasDeCaso(getDb(), slug);
  if (!metricas) notFound();
  return (
    <main className="grid gap-6">
      <nav className="text-sm" aria-label="Volver"><Link className="font-bold text-accent hover:underline" href="/admin/contenido">← Contenido</Link></nav>
      <h1 className="text-3xl font-black">{metricas.caso.titulo}</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-border"><th className="p-2">Misión</th><th className="p-2">Iniciaron</th><th className="p-2">Aprobaron</th><th className="p-2">Aprobación</th><th className="p-2">Intentos</th><th className="p-2">{`Sin avance en ${DIAS_ABANDONO} días`}</th><th className="p-2">Trabas</th></tr></thead>
          <tbody>{metricas.misiones.map((mision) => <tr key={mision.slug} className="border-b border-border align-top"><td className="p-2 font-bold">{mision.titulo}</td><td className="p-2">{mision.iniciaron}</td><td className="p-2">{mision.aprobaron}</td><td className="p-2">{mision.iniciaron > 0 ? porcentaje(mision.tasaAprobacion) : "—"}</td><td className="p-2">{mision.intentosPromedio}</td><td className="p-2">{mision.abandonos}</td><td className="p-2">{mision.trabas.length ? mision.trabas.map((t) => `${t.tarea}: ${t.estudiantes}`).join(" · ") : "—"}</td></tr>)}</tbody>
        </table>
      </div>
    </main>
  );
}
