import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { AvisoVerificacion } from "@/components/cuenta/aviso-verificacion";
import { SelectorRutas } from "@/components/rutas/selector-rutas";
import { auth } from "@/lib/auth";
import { accesoBeta } from "@/lib/beta";
import { fechaCertificado } from "@/lib/certificados/formato";
import { listarCertificados } from "@/lib/certificados/servicio";
import { casosParaConstruir, incluirBorradores } from "@/lib/contenido";
import { necesitaVerificar } from "@/lib/cuenta/verificacion";
import { calcularNivel } from "@/lib/puntos/niveles";
import { obtenerNivel } from "@/lib/puntos/servicio";
import { siguientePaso } from "@/lib/progreso/continuar";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";
import { estadoContinuar } from "@/lib/rutas/continuar";
import { progresoPorRuta, rutasParaSelector } from "@/lib/rutas/estado";
import { rutasParaSelectorUi } from "@/lib/rutas/selector";
import { unidad } from "@/lib/unidad";

export const metadata = { title: "Tu panel" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  const userId = session?.user?.id;
  const db = getDb();
  const [cuenta] = userId
    ? await db
        .select({
          rutaElegida: users.rutaElegida,
        })
        .from(users)
        .where(eq(users.id, userId))
    : [];
  const casosDelUsuario = userId ? await listarCasosDelUsuario(db, userId) : [];
  const certificados = userId ? await listarCertificados(db, userId) : [];
  const nivel = userId ? await obtenerNivel(db, userId) : calcularNivel(0);
  const verificar = userId ? await necesitaVerificar(db, userId) : false;
  const casos = await casosParaConstruir();
  const puedeBeta = userId ? await accesoBeta(db, userId) : false;
  const catalogo = await rutasParaSelector(puedeBeta);
  const rutasSelector = rutasParaSelectorUi(catalogo, casos);
  const progresoRutas = userId
    ? await progresoPorRuta(db, userId)
    : new Map<string, { completos: number; iniciados: number }>();
  const elegida = cuenta?.rutaElegida
    ? (catalogo.find((ruta) => ruta.id === cuenta.rutaElegida) ?? null)
    : null;
  const publicados = new Set(casos.map((caso) => caso.slug));
  // Las clases se cuentan en lecciones; el progreso guardado no sabe el tipo, el contenido sí.
  const esClases = (slug: string) =>
    casos.find((caso) => caso.slug === slug)?.tipo === "clases";
  const paso = userId ? await siguientePaso(db, userId, publicados) : null;
  const continuar = estadoContinuar({
    casoPendiente: paso?.caso.slug ?? null,
    elegida,
    rutas: catalogo,
    completosPorRuta: new Map(
      [...progresoRutas].map(([slug, avance]) => [slug, avance.completos]),
    ),
    puedeBeta,
    todoVisible: incluirBorradores(),
  });
  const disponibles = rutasSelector.filter(
    (ruta) =>
      ruta.estadoVigente === "publicada" || ruta.estadoVigente === "beta",
  );
  // Tus rutas: las que puedes hacer y en las que ya empezaste algo, o la que elegiste.
  const tusRutas = disponibles.filter(
    (ruta) => progresoRutas.has(ruta.slug) || ruta.slug === elegida?.slug,
  );
  // Explora más: el resto, sin repetir lo que ya está arriba.
  const explorar = rutasSelector.filter(
    (ruta) => !tusRutas.some((tuya) => tuya.slug === ruta.slug),
  );
  const betas = puedeBeta
    ? catalogo.filter((ruta) => ruta.estadoVigente === "beta")
    : [];
  const seElige = continuar.tipo === "elegir" || continuar.tipo === "pausa";
  const rutaUi = (slug: string) =>
    rutasSelector.find((ruta) => ruta.slug === slug) ?? null;
  const primerPaso = (slug: string) => rutaUi(slug)?.primerPaso ?? null;
  const primerPasoHref = (slug: string) => rutaUi(slug)?.primerPasoHref ?? null;
  return (
    <main className="dashboard-page mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Fuera de la tarjeta "Continuar": quien todavía no empieza o ya terminó todo también ve su avance. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm font-bold text-accent">{"> whoami"}</p>
        <Link
          href="/dashboard/avance"
          className="font-mono text-sm font-bold text-accent hover:underline"
        >
          {"$ git status → Ver tu avance"}
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Hola, {name}</h1>
      </div>
      {verificar ? <AvisoVerificacion /> : null}
      {paso ? (
        <section
          className="card dashboard-resume grid gap-4 p-6 sm:p-8"
          aria-label="Continuar"
        >
          <h2 className="text-2xl font-bold tracking-tight">
            Tu siguiente paso
          </h2>
          <p className="font-mono text-sm font-bold text-accent">
            {continuar.tipo === "paso" && continuar.ruta
              ? `> git checkout ${continuar.ruta.slug} · continuar`
              : "> continuar"}
          </p>
          {paso.tipo === "mision" ? (
            <p className="text-lg leading-7">
              {esClases(paso.caso.slug) ? (
                <>
                  Sigue con <strong>{paso.mision.titulo}</strong>, de{" "}
                  <strong>{paso.caso.titulo}</strong>.
                </>
              ) : (
                <>
                  Sigue con <strong>{paso.mision.titulo}</strong>, del caso{" "}
                  <strong>{paso.caso.titulo}</strong>.
                </>
              )}
            </p>
          ) : (
            <p className="text-lg leading-7">
              Aprobaste todas las misiones de{" "}
              <strong>{paso.caso.titulo}</strong>. Te falta enlazar tu
              entregable para completarlo.
            </p>
          )}
          {continuar.tipo === "paso" && continuar.ruta ? (
            <div className="grid gap-1">
              <p className="flex justify-between gap-3 text-sm text-muted-foreground">
                <span>{continuar.ruta.titulo}</span>
                <span>{`${continuar.ruta.completos} de ${continuar.ruta.total} pasos`}</span>
              </p>
              <div
                role="progressbar"
                aria-label={`Avance en ${continuar.ruta.titulo}`}
                aria-valuemin={0}
                aria-valuemax={continuar.ruta.total}
                aria-valuenow={continuar.ruta.completos}
                className="h-2 overflow-hidden rounded-full bg-surface-raised"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${continuar.ruta.total ? Math.round((continuar.ruta.completos / continuar.ruta.total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Link href={paso.href} className="btn btn-primary btn-form">
              {paso.tipo === "mision"
                ? `Continuar ${unidad(esClases(paso.caso.slug) ? "clases" : "caso").nombre}`
                : "Ir al caso"}
            </Link>
            {continuar.tipo === "paso" && continuar.ruta ? (
              <Link
                href={`/rutas/${continuar.ruta.slug}`}
                className="text-sm font-bold text-accent hover:underline"
              >
                Ver el mapa de la ruta
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
      {continuar.tipo === "empezar" ? (
        <section
          className="card dashboard-resume grid gap-4 p-6 sm:p-8"
          aria-label="Continuar"
        >
          <h2 className="text-2xl font-bold tracking-tight">
            Tu siguiente paso
          </h2>
          <p className="font-mono text-sm font-bold text-accent">{`> git checkout ${continuar.ruta.slug}`}</p>
          <p className="text-lg leading-7">
            Tu ruta: <strong>{continuar.ruta.titulo}</strong>
            {primerPaso(continuar.ruta.slug) ? (
              <>
                {" "}
                · Empieza por <strong>{primerPaso(continuar.ruta.slug)}</strong>
                .
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={
                primerPasoHref(continuar.ruta.slug) ??
                `/rutas/${continuar.ruta.slug}`
              }
              className="btn btn-primary btn-form"
            >
              {elegida ? "Empezar" : "Empezar tu primera lección"}
            </Link>
            <Link
              href={`/rutas/${continuar.ruta.slug}`}
              className="text-sm font-bold text-accent hover:underline"
            >
              Ver el mapa de la ruta
            </Link>
          </div>
        </section>
      ) : null}
      {seElige ? (
        <section className="grid gap-3" aria-label="Elige tu ruta">
          <h2 className="text-xl font-bold tracking-tight">Elige tu ruta</h2>
          {continuar.tipo === "pausa" ? (
            <p
              role="status"
              className="text-sm text-muted-foreground"
            >{`Tu ruta ${continuar.ruta.titulo} está en pausa. Tu progreso queda guardado.`}</p>
          ) : null}
          <SelectorRutas
            rutas={rutasSelector}
            sesion={Boolean(userId)}
            accion="Elegir"
          />
        </section>
      ) : null}
      {tusRutas.length > 0 ? (
        <section className="grid gap-3" aria-label="Tus rutas">
          <h2 className="text-xl font-bold tracking-tight">Tus rutas</h2>
          <ul className="grid gap-3">
            {tusRutas.map((ruta) => (
              <li key={ruta.slug}>
                <Link
                  href={`/rutas/${ruta.slug}`}
                  className="card flex items-center justify-between gap-4 p-4 hover:border-primary"
                >
                  <span className="font-bold">
                    {ruta.titulo}
                    {ruta.slug === elegida?.slug ? (
                      <span className="badge ml-2">tu ruta</span>
                    ) : null}
                  </span>
                  <span className="badge">{`${progresoRutas.get(ruta.slug)?.completos ?? 0} de ${ruta.casos.length} pasos`}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            className="w-fit text-sm font-bold text-accent hover:underline"
            href="/rutas"
          >
            Cambiar de ruta
          </Link>
        </section>
      ) : null}
      <section className="grid gap-3">
        <h2 className="text-xl font-bold tracking-tight">Tus casos y clases</h2>
        {casosDelUsuario.length === 0 ? (
          <p className="text-muted-foreground">
            Todavía no empiezas ningún caso.{" "}
            <Link
              className="font-bold text-accent hover:underline"
              href="/rutas"
            >
              Mira las rutas
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3">
            {casosDelUsuario.map((caso) => (
              <li key={caso.slug}>
                <Link
                  href={`/casos/${caso.slug}`}
                  className="card flex items-center justify-between gap-4 p-4 hover:border-primary"
                >
                  <span className="font-bold">{caso.titulo}</span>
                  <span className="badge">
                    {caso.completo
                      ? "Completo"
                      : `${caso.misionesAprobadas}/${caso.totalMisiones} ${esClases(caso.slug) ? "lecciones" : "misiones"}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold tracking-tight">Tus certificados</h2>
        {certificados.length === 0 ? (
          <p className="text-muted-foreground">
            Cuando completes casos o rutas, aparecerán aquí.
          </p>
        ) : (
          <ul className="grid gap-3">
            {certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link
                  href={`/certificados/${certificado.codigo}`}
                  className="card flex items-center justify-between gap-4 p-4 hover:border-primary"
                >
                  <span>
                    <span className="block font-bold">
                      {certificado.titulo}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {fechaCertificado(certificado.emitidoEn)}
                    </span>
                  </span>
                  <span className="badge">
                    {certificado.tipo === "ruta" ? "Ruta" : "Caso"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card grid gap-1 p-4" aria-label="Tu nivel">
        <p className="font-mono text-sm font-bold text-accent">{`> nivel ${nivel.nivel}`}</p>
        <p className="text-xl font-bold tracking-tight">{`${nivel.puntos} puntos`}</p>
        <p className="text-sm text-muted-foreground">
          {`Te faltan ${nivel.faltan} para el nivel ${nivel.nivel + 1}. Sumas puntos al aprobar misiones, completar casos y acertar decisiones.`}
        </p>
      </section>
      {betas.length > 0 ? (
        <section
          className="card grid gap-3 border-primary p-5"
          aria-label="Rutas en beta"
        >
          <h2 className="text-xl font-bold tracking-tight">Rutas en beta</h2>
          <p className="text-sm text-muted-foreground">
            Las estás probando antes que el resto: no aparecen para los demás.
            Si algo falla, usa «Reportar un problema».
          </p>
          <ul className="grid gap-2">
            {betas.map((ruta) => (
              <li key={ruta.slug}>
                <Link
                  className="font-bold text-accent hover:underline"
                  href={`/rutas/${ruta.slug}`}
                >
                  {ruta.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!seElige && explorar.length > 0 ? (
        <section
          className="dashboard-explore grid gap-3 border-t border-border pt-8"
          aria-label="Explora más"
        >
          <h2 className="text-xl font-bold tracking-tight">Explora más</h2>
          <SelectorRutas
            rutas={explorar}
            sesion={Boolean(userId)}
            accion="Elegir"
          />
        </section>
      ) : null}
      <nav
        className="flex flex-wrap gap-3 text-sm font-bold"
        aria-label="Comunidad"
      >
        <Link
          className="text-accent hover:underline"
          href="/dashboard/preguntas"
        >
          Tus preguntas a docentes
        </Link>
        <Link className="text-accent hover:underline" href="/dashboard/clases">
          Tus clases
        </Link>
        <Link
          className="text-accent hover:underline"
          href="/dashboard/mensajes"
        >
          Tus mensajes
        </Link>
      </nav>
    </main>
  );
}
