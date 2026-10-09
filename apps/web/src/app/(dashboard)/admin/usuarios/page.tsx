import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { Button } from "@syntaxerror/ui/components/button";
import { Paginacion } from "@/components/admin/paginacion";
import { adminDePagina } from "@/lib/admin/acceso";
import { ETIQUETAS_ROL } from "@/lib/admin/etiquetas";
import { leerPagina } from "@/lib/admin/paginacion";
import { listarUsuarios } from "@/lib/admin/usuarios";

export const metadata = { title: "Usuarios · Administración" };
const fecha = (valor: Date) => valor.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });

export default async function UsuariosAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  await adminDePagina("/admin/usuarios");
  const { q = "", pagina } = await searchParams;
  const busqueda = q.slice(0, 100);
  const resultado = await listarUsuarios(getDb(), { busqueda, pagina: leerPagina(pagina) });
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl font-black">Usuarios</h1>
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="grid gap-1 text-sm font-bold">
          Buscar por nombre o email
          <input name="q" defaultValue={busqueda} maxLength={100} className="h-10 w-72 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground" />
        </label>
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>
      <p className="text-sm text-muted-foreground">{`${resultado.total} ${resultado.total === 1 ? "cuenta" : "cuentas"}`}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-border"><th className="p-2">Email</th><th className="p-2">Nombre</th><th className="p-2">Rol</th><th className="p-2">Email confirmado</th><th className="p-2">Registro</th></tr></thead>
          <tbody>
            {resultado.filas.map((fila) => (
              <tr key={fila.id} className="border-b border-border">
                <td className="p-2"><Link className="font-bold text-accent hover:underline" href={`/admin/usuarios/${fila.id}`}>{fila.email}</Link></td>
                <td className="p-2">{fila.nombre ?? "—"}</td>
                <td className="p-2">{ETIQUETAS_ROL[fila.rol]}{fila.probador ? <span className="badge ml-2">Probador</span> : null}</td>
                <td className="p-2">{fila.verificado ? "Sí" : "No"}</td>
                <td className="p-2">{fecha(fila.creadoEn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion ruta="/admin/usuarios" parametros={busqueda ? { q: busqueda } : {}} pagina={resultado.pagina} paginas={resultado.paginas} />
    </main>
  );
}
