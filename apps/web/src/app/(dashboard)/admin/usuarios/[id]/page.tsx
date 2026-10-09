import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EliminarUsuario } from "@/components/admin/eliminar-usuario";
import { EnviarAvance } from "@/components/admin/enviar-avance";
import { FormularioProbador } from "@/components/admin/formulario-probador";
import { FormularioRol } from "@/components/admin/formulario-rol";
import { ListaEntregas } from "@/components/avance/entregas";
import { GitLogRutas } from "@/components/avance/git-log-rutas";
import { TailActividad } from "@/components/avance/tail-actividad";
import { SeccionTerminal } from "@/components/avance/terminal";
import { adminDePagina } from "@/lib/admin/acceso";
import { ETIQUETAS_ROL } from "@/lib/admin/etiquetas";
import { avanceDelAlumno } from "@/lib/avance/datos";
import { MAXIMO_NOTA, ultimoEnvio } from "@/lib/avance/enviar";
import { haceCuanto, trabasDelAlumno } from "@/lib/avance/trabas";
import { esUuid } from "@/lib/uuid";

export const metadata = { title: "Usuario · Administración" };

export default async function UsuarioAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await adminDePagina(`/admin/usuarios/${id}`);
  if (!esUuid(id)) notFound();
  const db = getDb();
  const [avance, envio] = await Promise.all([avanceDelAlumno(db, id), ultimoEnvio(db, id)]);
  if (!avance) notFound();
  const ahora = new Date();
  const { perfil } = avance;
  const trabas = trabasDelAlumno(avance, ahora);
  const trabadas = new Set(trabas.filter((traba) => traba.tipo === "leccion").map((traba) => traba.href));
  const esPropia = perfil.id === admin.id;
  return (
    <main className="grid gap-6">
      <nav className="text-sm" aria-label="Volver"><Link className="font-bold text-accent hover:underline" href="/admin/usuarios">← Usuarios</Link></nav>
      <SeccionTerminal comando="whoami" etiqueta="Perfil">
        <h1 className="font-sans text-3xl font-black">{perfil.nombre ?? perfil.email}</h1>
        <p>{`${perfil.email} · ${ETIQUETAS_ROL[perfil.rol]}${perfil.probador ? " · probador" : ""} · ${perfil.verificado ? "email confirmado" : "email sin confirmar"}`}</p>
        <p className="text-muted-foreground">
          {`registro ${haceCuanto(perfil.registradoEn, ahora)} · última actividad ${avance.ultimaActividad ? haceCuanto(avance.ultimaActividad, ahora) : "nunca"} · nivel ${perfil.nivel.nivel} (${perfil.nivel.puntos} puntos)`}
        </p>
      </SeccionTerminal>
      <SeccionTerminal comando="status" etiqueta="Trabas">
        {trabas.length === 0 ? (
          <p className="text-emerald-600 dark:text-emerald-400">0 problemas · todo en orden</p>
        ) : (
          <ul className="grid gap-1">
            {trabas.map((traba, indice) => (
              <li key={`${traba.tipo}-${indice}`} className="text-red-600 dark:text-red-400">
                <span className="font-bold">{`[${traba.tipo}] `}</span>
                <Link href={traba.href} className="hover:underline">{traba.admin}</Link>
              </li>
            ))}
          </ul>
        )}
      </SeccionTerminal>
      <GitLogRutas rutas={avance.rutas} otrosCasos={avance.otrosCasos} modo="admin" trabadas={trabadas} />
      <TailActividad eventos={avance.actividad} ahora={ahora} />
      <ListaEntregas entregas={avance.entregas} modo="admin" email={perfil.email} />
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Enviar avance</h2>
        <EnviarAvance userId={perfil.id} maximo={MAXIMO_NOTA} verificado={perfil.verificado} ultimo={envio ? `Último envío: ${haceCuanto(envio.fecha, ahora)}, por ${envio.actorEmail ?? "alguien de administración"}.` : null} />
      </section>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Rol</h2>
        {esPropia ? <p className="text-sm text-muted-foreground">Es tu cuenta: tu rol no se cambia desde aquí.</p> : <FormularioRol userId={perfil.id} rolActual={perfil.rol} />}
      </section>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Probador</h2>
        <FormularioProbador userId={perfil.id} probadorActual={perfil.probador} />
      </section>
      {esPropia ? null : (
        <section className="card grid gap-3 border-red-600/40 p-5">
          <h2 className="text-xl font-black">Eliminar cuenta</h2>
          <p className="text-sm text-muted-foreground">Para solicitudes de eliminación por derechos ARCO. No se puede deshacer, y la persona recibe un aviso por email.</p>
          <EliminarUsuario userId={perfil.id} />
        </section>
      )}
    </main>
  );
}
