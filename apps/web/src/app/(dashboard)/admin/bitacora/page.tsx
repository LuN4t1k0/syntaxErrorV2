import { AUDIT_ACTIONS, type AuditAction } from "@syntaxerror/db/audit";
import { getDb } from "@syntaxerror/db/client";
import { Button } from "@syntaxerror/ui/components/button";
import { Paginacion } from "@/components/admin/paginacion";
import { adminDePagina } from "@/lib/admin/acceso";
import { listarBitacora } from "@/lib/admin/bitacora";
import { ETIQUETAS_ACCION } from "@/lib/admin/etiquetas";
import { leerPagina } from "@/lib/admin/paginacion";

export const metadata = { title: "Bitácora · Administración" };
const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "medium" });

export default async function BitacoraPage({ searchParams }: { searchParams: Promise<{ accion?: string; email?: string; pagina?: string }> }) {
  await adminDePagina("/admin/bitacora");
  const parametros = await searchParams;
  const accion = (AUDIT_ACTIONS as readonly string[]).includes(parametros.accion ?? "") ? (parametros.accion as AuditAction) : undefined;
  const email = (parametros.email ?? "").slice(0, 100);
  const resultado = await listarBitacora(getDb(), { accion, email, pagina: leerPagina(parametros.pagina) });
  const filtros: Record<string, string> = {};
  if (accion) filtros.accion = accion;
  if (email) filtros.email = email;
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl font-black">Bitácora</h1>
      <form className="flex flex-wrap items-end gap-3" method="get"><label className="grid gap-1 text-sm font-bold">Acción<select name="accion" defaultValue={accion ?? ""} className="h-10 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground"><option value="">Todas</option>{AUDIT_ACTIONS.map((opcion) => <option key={opcion} value={opcion}>{ETIQUETAS_ACCION[opcion]}</option>)}</select></label><label className="grid gap-1 text-sm font-bold">Email<input name="email" defaultValue={email} maxLength={100} className="h-10 w-64 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground" /></label><Button type="submit" variant="secondary">Filtrar</Button></form>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="p-2">Fecha</th><th className="p-2">Acción</th><th className="p-2">Quién</th><th className="p-2">Sobre</th><th className="p-2">Detalle</th><th className="p-2">IP</th></tr></thead><tbody>{resultado.filas.map((fila) => <tr key={fila.id} className="border-b border-border align-top"><td className="whitespace-nowrap p-2">{fecha(fila.creadoEn)}</td><td className="p-2">{ETIQUETAS_ACCION[fila.accion as AuditAction] ?? fila.accion}</td><td className="p-2">{fila.actorEmail ?? "—"}</td><td className="p-2 font-mono text-xs">{fila.destino ? `${fila.destino} ${fila.destinoId ?? ""}` : "—"}</td><td className="p-2 font-mono text-xs">{Object.keys(fila.metadata).length > 0 ? JSON.stringify(fila.metadata) : "—"}</td><td className="p-2 font-mono text-xs">{fila.ip ?? "—"}</td></tr>)}</tbody></table></div>
      <Paginacion ruta="/admin/bitacora" parametros={filtros} pagina={resultado.pagina} paginas={resultado.paginas} />
    </main>
  );
}
