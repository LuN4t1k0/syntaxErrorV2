import type { CSSProperties } from "react";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  ChevronRight,
  Clock3,
  Database,
  Flame,
  FlaskConical,
  GitBranch,
  GitCommitHorizontal,
  Lock,
  Map as MapaIcono,
  MessagesSquare,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  SquareCode,
  Star,
  Table2,
  Timer,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { getDb } from "@syntaxerror/db/client";
import { preguntasProfesor, users } from "@syntaxerror/db/schema";
import type { Caso } from "@syntaxerror/content/tipos";
import { AvisoVerificacion } from "@/components/cuenta/aviso-verificacion";
import { ActivarRuta } from "@/components/panel/activar-ruta";
import { auth } from "@/lib/auth";
import { accesoBeta } from "@/lib/beta";
import { fechaCertificado } from "@/lib/certificados/formato";
import { listarCertificados } from "@/lib/certificados/servicio";
import { casosParaConstruir, incluirBorradores } from "@/lib/contenido";
import { necesitaVerificar } from "@/lib/cuenta/verificacion";
import { herramientaDelCaso, iniciales, minutosEstimados, resumenCaso, resumenLeccion, type Herramienta } from "@/lib/panel/contenido";
import { resumenPractica } from "@/lib/practica/servicio";
import { calcularNivel, nombreNivel, PUNTOS_POR_NIVEL } from "@/lib/puntos/niveles";
import { obtenerNivel, PUNTOS } from "@/lib/puntos/servicio";
import { siguientePaso } from "@/lib/progreso/continuar";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";
import { estadoContinuar } from "@/lib/rutas/continuar";
import { progresoPorRuta, rutasParaSelector } from "@/lib/rutas/estado";
import { rutasParaSelectorUi } from "@/lib/rutas/selector";
import { unidad } from "@/lib/unidad";
import "@/components/panel/panel.css";

export const metadata = { title: "Tu panel" };

const ICONO_HERRAMIENTA: Record<Herramienta, typeof Database> = {
  sql: Database,
  planilla: Table2,
  python: SquareCode,
  github: GitBranch,
  caso: Briefcase,
};

const porcentaje = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

function Barra({ valor, etiqueta, max = 100 }: { valor: number; etiqueta: string; max?: number }) {
  return (
    <div className="panel-barra" role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor}>
      <div style={{ width: `${porcentaje(valor, max)}%` }} />
    </div>
  );
}

// Respuestas de docentes en los últimos 7 días y preguntas que siguen esperando.
async function resumenPreguntas(userId: string) {
  const semana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [fila] = await getDb()
    .select({
      recientes: sql<number>`count(*) filter (where ${preguntasProfesor.respondidaEn} >= ${semana.toISOString()})`.mapWith(Number),
      pendientes: sql<number>`count(*) filter (where ${preguntasProfesor.respondidaEn} is null)`.mapWith(Number),
    })
    .from(preguntasProfesor)
    .where(eq(preguntasProfesor.alumnoId, userId));
  return { recientes: fila?.recientes ?? 0, pendientes: fila?.pendientes ?? 0 };
}

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  const userId = session?.user?.id;
  const db = getDb();
  const [cuenta] = userId ? await db.select({ rutaElegida: users.rutaElegida }).from(users).where(eq(users.id, userId)) : [];
  const casosDelUsuario = userId ? await listarCasosDelUsuario(db, userId) : [];
  const certificados = userId ? await listarCertificados(db, userId) : [];
  const nivel = userId ? await obtenerNivel(db, userId) : calcularNivel(0);
  const practica = userId ? await resumenPractica(db, userId) : { minutosSemana: 0, racha: 0 };
  const preguntas = userId ? await resumenPreguntas(userId) : { recientes: 0, pendientes: 0 };
  const verificar = userId ? await necesitaVerificar(db, userId) : false;
  const casos = await casosParaConstruir();
  const puedeBeta = userId ? await accesoBeta(db, userId) : false;
  const catalogo = await rutasParaSelector(puedeBeta);
  const rutasSelector = rutasParaSelectorUi(catalogo, casos);
  const progresoRutas = userId ? await progresoPorRuta(db, userId) : new Map<string, { completos: number; iniciados: number }>();
  const elegida = cuenta?.rutaElegida ? (catalogo.find((ruta) => ruta.id === cuenta.rutaElegida) ?? null) : null;
  const publicados = new Set(casos.map((caso) => caso.slug));
  const contenidoCaso = (slug: string): Caso | undefined => casos.find((caso) => caso.slug === slug);
  // Las clases se cuentan en lecciones; el progreso guardado no sabe el tipo, el contenido sí.
  const esClases = (slug: string) => contenidoCaso(slug)?.tipo === "clases";
  const paso = userId ? await siguientePaso(db, userId, publicados) : null;
  const continuar = estadoContinuar({
    casoPendiente: paso?.caso.slug ?? null,
    elegida,
    rutas: catalogo,
    completosPorRuta: new Map([...progresoRutas].map(([slug, avance]) => [slug, avance.completos])),
    puedeBeta,
    todoVisible: incluirBorradores(),
  });
  const disponibles = rutasSelector.filter((ruta) => ruta.estadoVigente === "publicada" || ruta.estadoVigente === "beta");
  // Tus rutas: las que puedes hacer y en las que ya empezaste algo, o la que elegiste.
  const tusRutas = disponibles.filter((ruta) => progresoRutas.has(ruta.slug) || ruta.slug === elegida?.slug);
  const betas = puedeBeta ? catalogo.filter((ruta) => ruta.estadoVigente === "beta") : [];
  const rutaUi = (slug: string) => rutasSelector.find((ruta) => ruta.slug === slug) ?? null;
  const tecnologias = (slug: string) => catalogo.find((ruta) => ruta.slug === slug)?.tecnologias ?? [];

  // La ruta que ordena el panel: la del paso pendiente, la elegida o la primera que ya tiene avance.
  const slugPrincipal = (continuar.tipo === "paso" ? continuar.ruta?.slug : null) ?? elegida?.slug ?? tusRutas[0]?.slug ?? (continuar.tipo === "empezar" ? continuar.ruta.slug : null);
  // Las tarjetas de ruta: las activas; si todavía no tienes ninguna, las que puedes activar.
  const rutasDelPanel = tusRutas.length > 0 ? tusRutas : disponibles;
  const rutaPrincipal = slugPrincipal ? rutaUi(slugPrincipal) : null;
  // La ruta sugerida: la siguiente del catálogo que todavía no empiezas. Si no está abierta, se anuncia como próxima.
  const sugerida = rutasSelector.find((ruta) => !rutasDelPanel.some((listada) => listada.slug === ruta.slug)) ?? null;
  const sugeridaAbierta = sugerida ? disponibles.some((ruta) => ruta.slug === sugerida.slug) : false;

  // El siguiente caso de tu ruta que todavía no empiezas: el «nuevo desafío».
  const empezados = new Set(casosDelUsuario.map((caso) => caso.slug));
  const desafio = rutaPrincipal
    ? rutaPrincipal.casos.map(contenidoCaso).find((caso): caso is Caso => Boolean(caso) && !empezados.has(caso!.slug) && caso!.slug !== paso?.caso.slug)
    : undefined;

  // Lección en curso: su posición dentro del caso y cuánto lleva aprobado.
  const casoPaso = paso ? contenidoCaso(paso.caso.slug) : undefined;
  const misionPaso = paso?.tipo === "mision" ? casoPaso?.misiones.find((mision) => mision.slug === paso.mision.slug) : undefined;
  const indicePaso = misionPaso && casoPaso ? casoPaso.misiones.indexOf(misionPaso) : -1;
  const avancePaso = casosDelUsuario.find((caso) => caso.slug === paso?.caso.slug);
  const enCurso = casosDelUsuario.filter((caso) => !caso.completo).length;

  const certificables = rutaPrincipal ? rutaPrincipal.casos.filter((slug) => contenidoCaso(slug)?.tipo === "caso").length + 1 : 0;
  const puntosEnNivel = nivel.puntos % PUNTOS_POR_NIVEL;
  const totalCompletos = [...progresoRutas.values()].reduce((total, avance) => total + avance.completos, 0);

  return (
    <main className="panel mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:gap-10 lg:px-8">
      <section className="panel-card panel-bienvenida" aria-label="Resumen de tu panel">
        <div className="panel-bienvenida-cabeza">
          <div>
            <p className="panel-pildora">
              <span className="panel-punto" aria-hidden="true" />
              session_active: <strong>dev_terminal_v2.4</strong>
            </p>
            <h1>
              Hola, {name} <span aria-hidden="true">👋</span>
            </h1>
            <p className="panel-subtitulo">Tu terminal de aprendizaje está lista. ¿Qué vamos a dominar hoy?</p>
          </div>
          <Link href="/dashboard/avance" className="panel-terminal" aria-label="Ver tu avance">
            <span className="panel-terminal-barra" aria-hidden="true">
              <i />
              <i />
              <i />
              <small>~/syntaxerror</small>
            </span>
            <span>
              <b>$</b> whoami <i aria-hidden="true">→</i> <code>student@{slugPrincipal ?? "syntaxerror"}</code>
            </span>
            <span>
              <b>$</b> git status <i aria-hidden="true">→</i>{" "}
              <em>
                <GitCommitHorizontal size={14} aria-hidden="true" />
                {paso ? "1 commit pendiente en main" : totalCompletos ? `${totalCompletos} pasos en main` : "nothing to commit"}
              </em>
            </span>
          </Link>
        </div>
        <div className="panel-stats">
          <div className="panel-stat panel-stat-racha">
            <span className="panel-stat-icono"><Flame size={20} aria-hidden="true" /></span>
            <span>
              <small>Consistencia</small>
              <strong>{practica.racha > 0 ? `Racha de ${practica.racha} ${practica.racha === 1 ? "día" : "días"}` : "Empieza tu racha hoy"}</strong>
            </span>
          </div>
          <div className="panel-stat panel-stat-xp">
            <span className="panel-stat-icono"><Star size={20} aria-hidden="true" /></span>
            <span>
              <small>Experiencia</small>
              <strong>
                {`${puntosEnNivel} / ${PUNTOS_POR_NIVEL} XP`} <i>(Nivel {nivel.nivel})</i>
              </strong>
            </span>
          </div>
          <div className="panel-stat panel-stat-tiempo">
            <span className="panel-stat-icono"><Clock3 size={20} aria-hidden="true" /></span>
            <span>
              <small>Tiempo en código</small>
              <strong>{`${practica.minutosSemana} min esta semana`}</strong>
            </span>
          </div>
        </div>
      </section>

      {verificar ? <AvisoVerificacion /> : null}

      {paso ? (
        <section className="panel-card panel-siguiente" aria-label="Continuar">
          <div className="panel-siguiente-cabeza">
            <p className="panel-comando">
              {continuar.tipo === "paso" && continuar.ruta ? `> git checkout ${continuar.ruta.slug} --continue` : "> git checkout --continue"}
              <span className="panel-cursor" aria-hidden="true" />
            </p>
            <span className="panel-etiqueta-paso"><span className="panel-punto" aria-hidden="true" /> Tu siguiente paso inmediato</span>
          </div>
          <div className="panel-siguiente-cuerpo">
            <div>
              <p className="panel-modulo">
                {(() => {
                  const Icono = ICONO_HERRAMIENTA[casoPaso ? herramientaDelCaso(casoPaso) : "caso"];
                  return <Icono size={16} aria-hidden="true" />;
                })()}
                {`${esClases(paso.caso.slug) ? "Módulo" : "Caso"}: ${paso.caso.titulo}${continuar.tipo === "paso" && continuar.ruta ? ` (${continuar.ruta.titulo} path)` : ""}`}
              </p>
              {paso.tipo === "mision" ? (
                <>
                  <h2>
                    {`${unidad(esClases(paso.caso.slug) ? "clases" : "caso").Nombre} en progreso: `}
                    <span>{paso.mision.titulo}</span>
                  </h2>
                  {misionPaso && resumenLeccion(misionPaso) ? <p className="panel-descripcion">{resumenLeccion(misionPaso)}</p> : null}
                </>
              ) : (
                <>
                  <h2>
                    Tu caso está casi listo: <span>{paso.caso.titulo}</span>
                  </h2>
                  <p className="panel-descripcion">Aprobaste todas las misiones. Te falta enlazar tu entregable para completarlo.</p>
                </>
              )}
              {casoPaso && avancePaso ? (
                <div className="panel-avance">
                  <p>
                    <span>
                      {indicePaso >= 0
                        ? `${unidad(casoPaso.tipo).Nombre} ${indicePaso + 1} de ${casoPaso.misiones.length}`
                        : `${avancePaso.misionesAprobadas} de ${avancePaso.totalMisiones} aprobadas`}
                    </span>
                    <strong>{`${porcentaje(avancePaso.misionesAprobadas, avancePaso.totalMisiones)}% completado`}</strong>
                  </p>
                  <Barra
                    etiqueta={`Avance en ${casoPaso.titulo}`}
                    valor={avancePaso.misionesAprobadas}
                    max={avancePaso.totalMisiones}
                  />
                </div>
              ) : null}
            </div>
            <div className="panel-acciones">
              <Link href={paso.href} className="panel-boton panel-boton-primario">
                <Play size={16} aria-hidden="true" />
                {paso.tipo === "mision" ? `Continuar ${unidad(esClases(paso.caso.slug) ? "clases" : "caso").nombre} ahora` : "Ir al caso"}
                <Zap size={16} aria-hidden="true" />
              </Link>
              {continuar.tipo === "paso" && continuar.ruta ? (
                <Link href={`/rutas/${continuar.ruta.slug}`} className="panel-boton panel-boton-claro">
                  <MapaIcono size={16} aria-hidden="true" /> Mapa de ruta
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {continuar.tipo === "empezar" ? (
        <section className="panel-card panel-siguiente" aria-label="Continuar">
          <div className="panel-siguiente-cabeza">
            <p className="panel-comando">
              {`> git checkout ${continuar.ruta.slug} --continue`}
              <span className="panel-cursor" aria-hidden="true" />
            </p>
            <span className="panel-etiqueta-paso"><span className="panel-punto" aria-hidden="true" /> Tu siguiente paso inmediato</span>
          </div>
          <div className="panel-siguiente-cuerpo">
            <div>
              <p className="panel-modulo"><Rocket size={16} aria-hidden="true" /> {`Ruta: ${continuar.ruta.titulo}`}</p>
              <h2>
                Comienza tu primera lección{rutaUi(continuar.ruta.slug)?.primerPaso ? <>: <span>{rutaUi(continuar.ruta.slug)?.primerPaso}</span></> : null}
              </h2>
              <p className="panel-descripcion">
                Tu ruta: <strong>{continuar.ruta.titulo}</strong>
                {rutaUi(continuar.ruta.slug)?.primerPaso ? <> · Empieza por <strong>{rutaUi(continuar.ruta.slug)?.primerPaso}</strong>.</> : null}
              </p>
            </div>
            <div className="panel-acciones">
              <Link href={rutaUi(continuar.ruta.slug)?.primerPasoHref ?? `/rutas/${continuar.ruta.slug}`} className="panel-boton panel-boton-primario">
                <Play size={16} aria-hidden="true" /> {elegida ? "Empezar" : "Empezar tu primera lección"} <Zap size={16} aria-hidden="true" />
              </Link>
              <Link href={`/rutas/${continuar.ruta.slug}`} className="panel-boton panel-boton-claro">
                <MapaIcono size={16} aria-hidden="true" /> Mapa de ruta
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="panel-columnas">
        <div className="grid content-start gap-10">
          <section className="grid gap-4" aria-label="Tus rutas">
            <div className="panel-seccion-cabeza">
              <div>
                <p className="panel-ceja">{tusRutas.length > 0 ? "01 / rutas activas" : "01 / tu punto de partida"}</p>
                <h2 className="panel-titulo-seccion">{tusRutas.length > 0 ? "Tus rutas de aprendizaje activas" : "Activa tu ruta de aprendizaje"}</h2>
              </div>
              <Link className="panel-enlace" href="/rutas">Explorar catálogo <ChevronRight size={16} aria-hidden="true" /></Link>
            </div>
            {continuar.tipo === "pausa" ? (
              <p role="status" className="panel-aviso">{`Tu ruta ${continuar.ruta.titulo} está en pausa. Tu progreso queda guardado.`}</p>
            ) : null}
            {rutasDelPanel.length === 0 ? (
              <p className="panel-aviso">Estamos terminando la primera ruta. Vuelve pronto.</p>
            ) : (
              <ul className="grid gap-4">
                {rutasDelPanel.map((ruta) => {
                  const completos = progresoRutas.get(ruta.slug)?.completos ?? 0;
                  const activa = tusRutas.some((tuya) => tuya.slug === ruta.slug);
                  return (
                    <li key={ruta.slug} className={activa ? "panel-card panel-ruta panel-ruta-activa" : "panel-card panel-ruta"}>
                      <div className="panel-ruta-cabeza">
                        <span className="panel-ruta-sigla" aria-hidden="true">{iniciales(ruta.titulo)}</span>
                        <div className="min-w-0 flex-1">
                          <h3>
                            <Link href={`/rutas/${ruta.slug}`}>{ruta.titulo}</Link>
                            <span className={activa ? "panel-chip panel-chip-exito" : "panel-chip"}>{activa ? "En curso" : ruta.estadoVigente === "beta" ? "Beta" : "Disponible"}</span>
                          </h3>
                          <p className="panel-ruta-cargo">{ruta.cargo}</p>
                          <p>{ruta.descripcion}</p>
                        </div>
                        {activa ? (
                          <Link className="panel-boton panel-boton-suave" href={`/rutas/${ruta.slug}`}>
                            <MapaIcono size={15} aria-hidden="true" /> Ver mapa
                          </Link>
                        ) : (
                          <ActivarRuta slug={ruta.slug} titulo={ruta.titulo} />
                        )}
                      </div>
                      <div className="panel-avance">
                        <p>
                          <span>{activa ? "Progreso de la ruta" : `${ruta.totalClases} clases · ${ruta.totalCasos} casos`}</span>
                          <strong>{`${completos} de ${ruta.casos.length} pasos completados`}</strong>
                        </p>
                        <Barra etiqueta={`Avance en ${ruta.titulo}`} valor={completos} max={ruta.casos.length} />
                      </div>
                      {tecnologias(ruta.slug).length > 0 ? (
                        <p className="panel-tecnologias">
                          <span>stack:</span>
                          {tecnologias(ruta.slug).map((tecnologia) => <code key={tecnologia}>{tecnologia}</code>)}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {sugerida ? (
              <div className="panel-sugerida">
                <span className="panel-sugerida-icono"><Sparkles size={20} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="panel-sugerida-titulo">
                    <strong>{`Ruta sugerida: ${sugerida.titulo}`}</strong>
                    <code>{sugeridaAbierta ? "Disponible" : sugerida.estadoVigente === "beta" ? "En beta" : "Próximamente"}</code>
                  </p>
                  <p>{sugerida.teaser ?? sugerida.descripcion}</p>
                </div>
                <Link className="panel-enlace" href={sugeridaAbierta ? `/rutas/${sugerida.slug}` : "/rutas"}>
                  Ver temario {sugeridaAbierta ? <ArrowRight size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
                </Link>
              </div>
            ) : null}
          </section>

          <section className="grid gap-4" aria-label="Tus casos y clases">
            <div className="panel-seccion-cabeza">
              <div>
                <p className="panel-ceja">02 / la práctica es la clase</p>
                <h2 className="panel-titulo-seccion">Tus casos prácticos y clases</h2>
              </div>
              {enCurso > 0 ? <span className="panel-nota">{`${enCurso} ${enCurso === 1 ? "módulo" : "módulos"} en curso`}</span> : null}
            </div>
            {casosDelUsuario.length === 0 && !desafio ? (
              <p className="text-muted-foreground">
                Todavía no empiezas ningún caso.{" "}
                <Link className="font-bold text-accent hover:underline" href="/rutas">Mira las rutas</Link>.
              </p>
            ) : (
              <ul className="grid gap-4">
                {casosDelUsuario.map((caso) => {
                  const contenido = contenidoCaso(caso.slug);
                  const herramienta = contenido ? herramientaDelCaso(contenido) : "caso";
                  const Icono = ICONO_HERRAMIENTA[herramienta];
                  return (
                    <li key={caso.slug}>
                      <Link href={`/casos/${caso.slug}`} className={`panel-card panel-caso panel-caso-${herramienta}`}>
                        <span className="panel-caso-icono"><Icono size={20} aria-hidden="true" /></span>
                        <span className="panel-caso-cuerpo">
                          <span className="panel-caso-titulo">
                            <strong>{caso.titulo}</strong>
                            <code>
                              {caso.completo ? "Completo" : `${caso.misionesAprobadas}/${caso.totalMisiones} ${esClases(caso.slug) ? "lecciones" : "misiones"}`}
                            </code>
                          </span>
                          {contenido ? <span className="panel-caso-texto">{resumenCaso(contenido)}</span> : null}
                          <Barra etiqueta={`Avance en ${caso.titulo}`} valor={caso.misionesAprobadas} max={caso.totalMisiones} />
                        </span>
                        <span className="panel-boton panel-boton-suave">
                          {caso.completo ? <BadgeCheck size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                          {caso.completo ? "Revisar" : "Reanudar"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {desafio ? (
                  <li>
                    <Link href={`/casos/${desafio.slug}`} className="panel-card panel-caso panel-caso-nuevo">
                      <span className="panel-caso-icono">
                        {(() => {
                          const Icono = ICONO_HERRAMIENTA[herramientaDelCaso(desafio)];
                          return <Icono size={20} aria-hidden="true" />;
                        })()}
                      </span>
                      <span className="panel-caso-cuerpo">
                        <span className="panel-caso-titulo">
                          <strong>{desafio.titulo}</strong>
                        </span>
                        <code className="panel-chip panel-chip-desafio">Nuevo desafío disponible</code>
                        <span className="panel-caso-texto">{resumenCaso(desafio)}</span>
                        <span className="panel-estimado"><Timer size={15} aria-hidden="true" /> {`Estimado: ${minutosEstimados(desafio)} minutos`}</span>
                      </span>
                      <span className="panel-boton panel-boton-secundario">
                        <Rocket size={16} aria-hidden="true" /> {desafio.tipo === "clases" ? "Comenzar clases" : "Comenzar caso"}
                      </span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-8">
          <section className="panel-card panel-nivel" aria-label="Tu nivel">
            <p className="panel-nivel-cabeza">
              <span>{`> nivel ${nivel.nivel} (${nombreNivel(nivel.nivel)})`}</span>
              <Trophy size={18} aria-hidden="true" />
            </p>
            <div className="panel-nivel-cuerpo">
              <div
                className="panel-anillo"
                role="progressbar"
                aria-label={`Avance en el nivel ${nivel.nivel}`}
                aria-valuemin={0}
                aria-valuemax={PUNTOS_POR_NIVEL}
                aria-valuenow={puntosEnNivel}
                style={{ "--avance": `${porcentaje(puntosEnNivel, PUNTOS_POR_NIVEL)}%` } as CSSProperties}
              >
                <span>{`${porcentaje(puntosEnNivel, PUNTOS_POR_NIVEL)}%`}</span>
              </div>
              <div>
                <p className="panel-nivel-xp">{`${nivel.puntos} XP acumulados`}</p>
                <p className="panel-nivel-falta">
                  Faltan <strong>{`${nivel.faltan} XP`}</strong> {`para el Nivel ${nivel.nivel + 1}: ${nombreNivel(nivel.nivel + 1)}`}
                </p>
              </div>
            </div>
            <div className="panel-recompensas">
              <p><Zap size={15} aria-hidden="true" /> Así sumas experiencia:</p>
              <ul>
                <li>{`+${PUNTOS.mision} XP por cada misión o lección aprobada`}</li>
                <li>{`+${PUNTOS.decision} XP por decisión de negocio acertada`}</li>
                <li>{`+${PUNTOS.caso} XP por caso de negocio completado`}</li>
              </ul>
            </div>
          </section>

          <section className="panel-card panel-certificados" aria-label="Tus certificados">
            <div className="panel-seccion-cabeza">
              <h2>Tus Certificados</h2>
              {certificables > 0 ? <code>{`${certificados.length} / ${Math.max(certificables, certificados.length)}`}</code> : null}
            </div>
            {certificados.length === 0 ? (
              <div className="panel-certificado-vacio">
                <div className="panel-sello" aria-hidden="true">
                  <ShieldCheck size={44} />
                  <strong>SYNTAXERROR.CL CERTIFIED</strong>
                  <span>{`ID: SYN-${rutaPrincipal ? iniciales(rutaPrincipal.titulo) : "SE"}-PENDING`}</span>
                </div>
                <p>
                  Aún no tienes certificados emitidos.{" "}
                  {rutaPrincipal ? (
                    <>
                      ¡Completa tu ruta de <strong>{rutaPrincipal.titulo}</strong> para obtener tu credencial verificable!
                    </>
                  ) : (
                    "Cuando completes casos o rutas, tus certificados verificables aparecerán aquí."
                  )}
                </p>
                <Link className="panel-enlace" href="/dashboard/avance">Ver tu avance <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            ) : (
              <ul className="grid gap-2">
                {certificados.map((certificado) => (
                  <li key={certificado.codigo}>
                    <Link href={`/certificados/${certificado.codigo}`} className="panel-acceso">
                      <span className="panel-acceso-icono"><BadgeCheck size={18} aria-hidden="true" /></span>
                      <span className="panel-acceso-texto">
                        <strong>{certificado.titulo}</strong>
                        <small>{`${certificado.tipo === "ruta" ? "Ruta" : "Caso"} · ${fechaCertificado(certificado.emitidoEn)}`}</small>
                      </span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-card panel-accesos" aria-label="Accesos de ayuda">
            <h2>Accesos Rápidos &amp; Mentoría</h2>
            <Link className="panel-acceso" href="/dashboard/preguntas">
              <span className="panel-acceso-icono"><MessagesSquare size={18} aria-hidden="true" /></span>
              <span className="panel-acceso-texto">
                <strong>Preguntas a docentes</strong>
                <small className={preguntas.recientes > 0 ? "panel-acceso-nuevo" : undefined}>
                  {preguntas.recientes > 0
                    ? `${preguntas.recientes} ${preguntas.recientes === 1 ? "respuesta nueva" : "respuestas nuevas"}`
                    : preguntas.pendientes > 0
                      ? `${preguntas.pendientes} ${preguntas.pendientes === 1 ? "pregunta espera" : "preguntas esperan"} respuesta`
                      : "Pregunta desde cualquier misión"}
                </small>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
            <Link className="panel-acceso" href="/dashboard/clases">
              <span className="panel-acceso-icono"><Users size={18} aria-hidden="true" /></span>
              <span className="panel-acceso-texto">
                <strong>Tus clases</strong>
                <small>Revisa tus grupos y materiales</small>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
            <Link className="panel-acceso" href="/dashboard/avance">
              <span className="panel-acceso-icono"><FlaskConical size={18} aria-hidden="true" /></span>
              <span className="panel-acceso-texto">
                <strong>Ver tu avance</strong>
                <small>Tu recorrido completo, paso a paso</small>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </section>

          {betas.length > 0 ? (
            <section className="panel-card panel-betas" aria-label="Rutas en beta">
              <h2>Rutas en beta</h2>
              <p>Las estás probando antes que el resto: no aparecen para los demás. Si algo falla, usa «Reportar un problema».</p>
              <ul className="grid gap-2">
                {betas.map((ruta) => (
                  <li key={ruta.slug}>
                    <Link className="panel-enlace" href={`/rutas/${ruta.slug}`}>{ruta.titulo}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
