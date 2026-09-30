import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { AvisoVerificacion } from "@/components/cuenta/aviso-verificacion";
import { auth } from "@/lib/auth";
import { fechaCertificado } from "@/lib/certificados/formato";
import { listarCertificados } from "@/lib/certificados/servicio";
import { casosParaPublicar } from "@/lib/contenido";
import { necesitaVerificar } from "@/lib/cuenta/verificacion";
import { calcularNivel } from "@/lib/puntos/niveles";
import { obtenerNivel } from "@/lib/puntos/servicio";
import { siguientePaso } from "@/lib/progreso/continuar";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";

export const metadata = { title: "Tu panel" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  const userId = session?.user?.id;
  const db = getDb();
  const casosDelUsuario = userId ? await listarCasosDelUsuario(db, userId) : [];
  const certificados = userId ? await listarCertificados(db, userId) : [];
  const nivel = userId ? await obtenerNivel(db, userId) : calcularNivel(0);
  const verificar = userId ? await necesitaVerificar(db, userId) : false;
  const publicados = new Set((await casosParaPublicar()).map((caso) => caso.slug));
  const paso = userId ? await siguientePaso(db, userId, publicados) : null;
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-sm font-bold text-primary">{"> whoami"}</p>
      <h1 className="text-3xl font-black">Hola, {name}</h1>
      <p className="max-w-2xl leading-7 text-muted-foreground">
        Aquí vas a ver tus casos en curso, tus entregables y tus certificados.
      </p>
      {verificar ? <AvisoVerificacion /> : null}
      {paso ? (
        <section className="card grid gap-3 border-primary p-5" aria-label="Continuar">
          <p className="font-mono text-sm font-bold text-primary">{"> continuar"}</p>
          {paso.tipo === "mision" ? (
            <p className="leading-7">
              Sigue con <strong>{paso.mision.titulo}</strong>, del caso <strong>{paso.caso.titulo}</strong>.
            </p>
          ) : (
            <p className="leading-7">
              Aprobaste todas las misiones de <strong>{paso.caso.titulo}</strong>. Te falta enlazar tu entregable para completarlo.
            </p>
          )}
          <div>
            <Link href={paso.href} className="btn btn-primary">{paso.tipo === "mision" ? "Continuar misión" : "Ir al caso"}</Link>
          </div>
        </section>
      ) : null}
      <section className="card grid gap-1 p-4" aria-label="Tu nivel">
        <p className="font-mono text-sm font-bold text-primary">{`> nivel ${nivel.nivel}`}</p>
        <p className="text-xl font-black">{`${nivel.puntos} puntos`}</p>
        <p className="text-sm text-muted-foreground">
          {`Te faltan ${nivel.faltan} para el nivel ${nivel.nivel + 1}. Sumas puntos al aprobar misiones, completar casos y acertar decisiones.`}
        </p>
      </section>
      <nav className="flex flex-wrap gap-3 text-sm font-bold" aria-label="Comunidad">
        <Link className="text-primary hover:underline" href="/dashboard/preguntas">Tus preguntas a docentes</Link>
        <Link className="text-primary hover:underline" href="/dashboard/clases">Tus clases</Link>
        <Link className="text-primary hover:underline" href="/dashboard/mensajes">Tus mensajes</Link>
      </nav>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus casos</h2>
        {casosDelUsuario.length === 0 ? (
          <p className="text-muted-foreground">
            Todavía no empiezas ningún caso.{" "}
            <Link className="font-bold text-primary hover:underline" href="/rutas">
              Mira las rutas
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3">
            {casosDelUsuario.map((caso) => (
              <li key={caso.slug}>
                <Link href={`/casos/${caso.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                  <span className="font-bold">{caso.titulo}</span>
                  <span className="badge">{caso.completo ? "Completo" : `${caso.misionesAprobadas}/${caso.totalMisiones} misiones`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus certificados</h2>
        {certificados.length === 0 ? (
          <p className="text-muted-foreground">Cuando completes casos o rutas, aparecerán aquí.</p>
        ) : (
          <ul className="grid gap-3">
            {certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link href={`/certificados/${certificado.codigo}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                  <span>
                    <span className="block font-bold">{certificado.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{fechaCertificado(certificado.emitidoEn)}</span>
                  </span>
                  <span className="badge">{certificado.tipo === "ruta" ? "Ruta" : "Caso"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
