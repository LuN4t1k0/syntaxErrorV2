import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { adminDePagina } from "@/lib/admin/acceso";
import { resumenAdmin } from "@/lib/admin/resumen";

export const metadata = { title: "Administración" };

function Tarjeta({ href, valor, texto, alerta = false }: { href: string; valor: number; texto: string; alerta?: boolean }) {
  return <Link href={href} className={alerta && valor > 0 ? "card grid gap-1 border-primary p-4 hover:border-primary" : "card grid gap-1 p-4 hover:border-primary"}><span className="text-3xl font-black">{valor}</span><span className="text-sm text-muted-foreground">{texto}</span></Link>;
}

export default async function AdminPage() {
  await adminDePagina("/admin");
  const resumen = await resumenAdmin(getDb());
  return (
    <main className="grid gap-8">
      <h1 className="text-3xl font-black">Administración</h1>
      <section className="grid gap-3"><h2 className="text-xl font-black">Por revisar</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Tarjeta href="/admin/comunidad" valor={resumen.solicitudesPendientes} texto="Solicitudes de acceso docente" alerta /><Tarjeta href="/admin/comunidad" valor={resumen.comentariosPendientes} texto="Comentarios de reseñas" alerta /><Tarjeta href="/admin/reportes" valor={resumen.reportesPendientes} texto="Reportes pendientes" alerta /><Tarjeta href="/profesor/preguntas" valor={resumen.preguntasSinDocente} texto="Preguntas sin docente" alerta /></div></section>
      <section className="grid gap-3"><h2 className="text-xl font-black">Actividad</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Tarjeta href="/admin/usuarios" valor={resumen.usuarios} texto="Cuentas" /><Tarjeta href="/admin/usuarios" valor={resumen.nuevosSemana} texto="Cuentas nuevas esta semana" /><Tarjeta href="/admin/usuarios" valor={resumen.docentes} texto="Docentes" /><Tarjeta href="/admin/preguntas?vista=tutor" valor={resumen.preguntasTutorSemana} texto="Preguntas al tutor esta semana" /></div></section>
    </main>
  );
}
