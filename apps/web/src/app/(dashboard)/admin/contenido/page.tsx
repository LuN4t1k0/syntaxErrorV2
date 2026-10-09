import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { adminDePagina } from "@/lib/admin/acceso";
import { resumenContenido } from "@/lib/admin/metricas";

export const metadata = { title: "Contenido · Administración" };

export default async function ContenidoAdminPage() {
  await adminDePagina("/admin/contenido");
  const filas = await resumenContenido(getDb());
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl font-black">Contenido y métricas</h1>
      <p className="max-w-3xl leading-7 text-muted-foreground">Los casos y rutas se publican desde el repositorio. Aquí ves estado, inscripciones y avance por caso.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-border"><th className="p-2">Caso</th><th className="p-2">Rutas</th><th className="p-2">Inscripciones</th><th className="p-2">Completados</th></tr></thead>
          <tbody>{filas.map((fila) => <tr key={fila.slug} className="border-b border-border"><td className="p-2"><Link className="font-bold text-accent hover:underline" href={`/admin/contenido/${fila.slug}`}>{fila.titulo}</Link></td><td className="p-2">{fila.rutas.length === 0 ? "Sin ruta" : fila.rutas.map((ruta) => `${ruta.titulo} (${ruta.estado})`).join(", ")}</td><td className="p-2">{fila.inscritos}</td><td className="p-2">{fila.completados}</td></tr>)}</tbody>
        </table>
      </div>
    </main>
  );
}
