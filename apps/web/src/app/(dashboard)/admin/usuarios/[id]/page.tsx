import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EliminarUsuario } from "@/components/admin/eliminar-usuario";
import { FormularioRol } from "@/components/admin/formulario-rol";
import { adminDePagina } from "@/lib/admin/acceso";
import { ETIQUETAS_ROL } from "@/lib/admin/etiquetas";
import { detalleUsuario } from "@/lib/admin/usuarios";
import { esUuid } from "@/lib/uuid";

export const metadata = { title: "Usuario · Administración" };

export default async function UsuarioAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await adminDePagina(`/admin/usuarios/${id}`);
  if (!esUuid(id)) notFound();
  const usuario = await detalleUsuario(getDb(), id);
  if (!usuario) notFound();
  const esPropia = usuario.id === admin.id;
  return (
    <main className="grid gap-6">
      <nav className="text-sm" aria-label="Volver"><Link className="font-bold text-primary hover:underline" href="/admin/usuarios">← Usuarios</Link></nav>
      <header className="grid gap-1">
        <h1 className="text-3xl font-black">{usuario.nombre ?? usuario.email}</h1>
        <p className="text-muted-foreground">{`${usuario.email} · ${ETIQUETAS_ROL[usuario.rol]} · ${usuario.verificado ? "email confirmado" : "email sin confirmar"}`}</p>
        <p className="text-sm text-muted-foreground">{`Nivel ${usuario.nivel.nivel} (${usuario.nivel.puntos} puntos) · ${usuario.certificados} ${usuario.certificados === 1 ? "certificado" : "certificados"}`}</p>
      </header>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Casos</h2>
        {usuario.casos.length === 0 ? <p className="text-muted-foreground">No empezó ningún caso.</p> : (
          <ul className="grid gap-2 text-sm">{usuario.casos.map((caso) => <li key={caso.slug}>{`${caso.titulo}: ${caso.completo ? "completo" : `${caso.misionesAprobadas}/${caso.totalMisiones} misiones`}`}</li>)}</ul>
        )}
      </section>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Rol</h2>
        {esPropia ? <p className="text-sm text-muted-foreground">Es tu cuenta: tu rol no se cambia desde aquí.</p> : <FormularioRol userId={usuario.id} rolActual={usuario.rol} />}
      </section>
      {esPropia ? null : (
        <section className="card grid gap-3 border-destructive/40 p-5">
          <h2 className="text-xl font-black">Eliminar cuenta</h2>
          <p className="text-sm text-muted-foreground">Para solicitudes de eliminación por derechos ARCO. No se puede deshacer, y la persona recibe un aviso por email.</p>
          <EliminarUsuario userId={usuario.id} />
        </section>
      )}
    </main>
  );
}
