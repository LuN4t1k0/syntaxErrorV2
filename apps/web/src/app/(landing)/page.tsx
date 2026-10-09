import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { incluirBorradores } from "@/lib/contenido";
import { listarRutasConEstado } from "@/lib/rutas/estado";
import { estadoPortada } from "@/lib/portada/disponibilidad";
import { DemoPortada } from "@/components/portada/demo-portada";
import { ThemeToggle } from "@/components/theme-toggle";
import { EnlaceReportar } from "@/components/comunidad/enlace-reportar";
import "@/components/portada/landing.css";

export const metadata = {
  title: "Aprende a trabajar con datos desde cero",
  description:
    "Aprende paso a paso, resuelve casos de práctica y construye tu portafolio. syntaxError: aprendizaje gratuito, a tu ritmo y con espacio para equivocarte.",
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const estado = estadoPortada(
    await listarRutasConEstado(),
    incluirBorradores(),
  );
  const disponible = estado === "disponible";
  const textoRegistro = disponible ? "Empezar gratis" : "Crear cuenta gratis";

  return (
    <div className="landing-home">
      <Link className="skip" href="#contenido">
        Saltar al contenido
      </Link>
      <header>
        <div className="wrap nav">
          <Link
            className="brand"
            href="#contenido"
            aria-label="syntaxError, inicio"
          >
            <span className="brand-icon" aria-hidden="true">
              {"{}"}
            </span>
            syntaxError<span className="accent">.cl</span>
          </Link>
          <nav aria-label="Principal">
            <Link href="#como">Cómo aprendes</Link>
            <Link href="#ruta">La ruta</Link>
          </nav>
          <div className="nav-actions">
            <div className="theme-control">
              <ThemeToggle />
            </div>
            <Link href="/login">Entrar</Link>
            <Link className="button small" href="/registro">
              {textoRegistro} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>
      <main id="contenido" className="wrap">
        <section className="hero" aria-labelledby="titulo">
          <div className="hero-copy">
            <div className="eyebrow">&gt; Aprende haciendo. Desde Chile.</div>
            <h1 id="titulo">
              Empieza de cero.
              <br />
              Aprende a trabajar
              <br />
              <span>con datos.</span>
            </h1>
            <p>
              De tu primera planilla a un proyecto que puedas mostrar. Aprende
              paso a paso, resuelve casos y construye tu portafolio. Gratis.
            </p>
            {!disponible ? (
              <p className="availability">
                {estado === "beta"
                  ? "Ruta en beta con acceso de prueba. Mientras tanto, puedes explorar este ejemplo sin cuenta."
                  : "Estamos preparando la ruta. Mientras tanto, prueba el ejemplo sin cuenta."}
              </p>
            ) : null}
            <div className="hero-actions">
              <Link className="button" href="/registro">
                {textoRegistro} <span aria-hidden="true">↗</span>
              </Link>
              <Link className="text-link" href="#demo">
                Probar un ejemplo <span aria-hidden="true">↓</span>
              </Link>
            </div>
            <div className="checks">
              <span>Desde cero</span>
              <span>A tu ritmo</span>
              <span>Sin tarjeta</span>
            </div>
          </div>
          <DemoPortada textoRegistro={textoRegistro} />
        </section>
        <div className="belief">
          <strong>
            Aquí, equivocarte también es aprender
            <span className="accent">_</span>
          </strong>
          <span className="mono">
            <b>[ok]</b> intenta · entiende · vuelve a probar
          </span>
        </div>
        <ComoAprendes />
        <RutaPortada
          estado={estado}
          disponible={disponible}
          textoRegistro={textoRegistro}
        />
        {disponible ? (
          <section
            className="section portfolio"
            aria-labelledby="portfolio-title"
          >
            <div>
              <div className="eyebrow">03 / Lo que te llevas</div>
              <h2 id="portfolio-title">
                «Mira lo que
                <br />
                sé hacer».
              </h2>
              <p>
                Que tu próximo paso tenga respaldo: consultas, análisis y
                recomendaciones que puedas explicar y compartir.
              </p>
              <p>
                Al aprobar los casos, sumas entregables a tu portafolio y
                certificados verificables.
              </p>
              <Link className="text-link" href="#ruta">
                Conoce el recorrido <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <article
              className="file"
              aria-label="Ejemplo de entregable del curso"
            >
              <div className="file-head">
                <span>↳ portafolio / ventas</span>
                <span>EJEMPLO</span>
              </div>
              <div className="file-body">
                <div className="eyebrow">SQL · Minimarkets del Sur</div>
                <h3>
                  De una pregunta
                  <br />a una recomendación.
                </h3>
                <p>
                  <strong>La pregunta</strong>
                  <br />
                  ¿Cómo cambiaron las ventas de cada local?
                </p>
                <p>
                  <strong>Tu trabajo</strong>
                  <br />
                  Consultas SQL, resultados y un README que explique qué
                  encontraste y qué recomiendas.
                </p>
                <div className="file-line">
                  consultas.sql &#160; README.md &#160; hallazgos ↗
                </div>
              </div>
            </article>
          </section>
        ) : null}
        <AyudaPortada />
        <section className="closing" aria-labelledby="closing-title">
          <div className="eyebrow">&gt; tu siguiente paso</div>
          <h2 id="closing-title">
            Tu primer intento
            <br />
            ya es un comienzo.
          </h2>
          <p>
            {disponible
              ? "Crea tu cuenta y empieza a construir algo tuyo."
              : "Puedes crear tu cuenta gratis. El acceso a la ruta estará sujeto a su disponibilidad."}
          </p>
          <Link className="button" href="/registro">
            {textoRegistro} <span aria-hidden="true">↗</span>
          </Link>
          <p className="caption">
            Desde cero. A tu ritmo. Con espacio para equivocarte.
            <span className="cursor" aria-hidden="true"></span>
          </p>
        </section>
      </main>
      <footer className="wrap footer">
        <span>
          syntaxError.cl
          <br />
          Hecho en Chile. Para aprender.
        </span>
        <Link href="/lun4t1k0" aria-label="El origen">
          &gt; El origen de syntaxError
        </Link>
        <nav className="footer-links" aria-label="Pie de página">
          <Link href="/nosotros">Por qué existimos</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
          <EnlaceReportar />
        </nav>
      </footer>
    </div>
  );
}

function ComoAprendes() {
  return (
    <>
      <section id="como" className="section" aria-labelledby="como-title">
        <div className="section-head">
          <div>
            <div className="eyebrow">01 / La práctica es la clase</div>
            <h2 id="como-title">
              Aprende algo.
              <br />
              Haz algo con eso.
            </h2>
          </div>
          <p>
            Cada paso tiene un propósito: que puedas resolver problemas por tu
            cuenta.
          </p>
        </div>
        <div className="steps">
          <article className="step">
            <span className="step-no">[01] aprende</span>
            <h3>Una idea a la vez.</h3>
            <p>
              Clases con ejemplos y ejercicios para practicar lo que acabas de
              aprender.
            </p>
          </article>
          <article className="step">
            <span className="step-no">[02] resuelve</span>
            <h3>Un problema con contexto.</h3>
            <p>
              Ventas, despachos y decisiones. Casos de práctica inspirados en el
              trabajo de un analista.
            </p>
          </article>
          <article className="step">
            <span className="step-no">[03] demuestra</span>
            <h3>Algo que puedas mostrar.</h3>
            <p>
              Convierte tus análisis en proyectos de portafolio y explica cómo
              llegaste a tus conclusiones.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}

function RutaPortada({
  estado,
  disponible,
  textoRegistro,
}: {
  estado: ReturnType<typeof estadoPortada>;
  disponible: boolean;
  textoRegistro: string;
}) {
  return (
    <>
      <section id="ruta" className="section" aria-labelledby="ruta-title">
        <div className="section-head">
          <div>
            <div className="eyebrow">02 / Un camino, paso a paso</div>
            <h2 id="ruta-title">
              {disponible
                ? "Tu punto de partida está aquí."
                : "Estamos preparando tu próximo paso."}
            </h2>
          </div>
        </div>
        {disponible ? (
          <>
            <div className="route">
              <div>
                <span className="tag">DESDE CERO · A TU RITMO</span>
                <h3>Analista de datos</h3>
                <p>
                  Aprende a ordenar información, hacer buenas preguntas y
                  convertir datos en decisiones.
                </p>
                <p>
                  Empiezas preparando tu espacio de proyectos en GitHub. Después
                  avanzas por las herramientas y sus casos de práctica.
                </p>
                <Link className="button" href="/registro">
                  {textoRegistro} <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <ol className="route-list">
                <li>
                  <span className="num">00</span>
                  <div>
                    GitHub y tu portafolio
                    <small>
                      Prepara el lugar donde mostrarás tus proyectos.
                    </small>
                  </div>
                </li>
                <li>
                  <span className="num">01</span>
                  <div>
                    Excel · ordena y analiza
                    <small>Encuentra qué está pasando con los despachos.</small>
                  </div>
                </li>
                <li>
                  <span className="num">02</span>
                  <div>
                    SQL · pregunta a los datos
                    <small>
                      Investiga las ventas de una cadena de minimarkets.
                    </small>
                  </div>
                </li>
                <li>
                  <span className="num">03</span>
                  <div>
                    Python · explora y automatiza
                    <small>Analiza los pedidos de una tienda online.</small>
                  </div>
                </li>
                <li>
                  <span className="num">04</span>
                  <div>
                    Power BI · comunica tus hallazgos
                    <small>Construye un dashboard para una clínica.</small>
                  </div>
                </li>
                <li>
                  <span className="num">05</span>
                  <div>
                    IA + proyecto final · aplica tu criterio
                    <small>
                      Contrasta respuestas y trabaja con un conjunto de datos.
                    </small>
                  </div>
                </li>
              </ol>
            </div>
            <p className="route-note">
              Practicas SQL, Python y planillas en el navegador. Para tu
              portafolio usarás GitHub; algunas actividades requieren
              herramientas externas, como Power BI Desktop.
            </p>
          </>
        ) : (
          <p className="availability">
            {estado === "beta"
              ? "La ruta de Analista de datos está en beta y requiere acceso de prueba. Crear una cuenta no habilita esta ruta automáticamente."
              : "La ruta de Analista de datos todavía no está abierta. Puedes probar el ejemplo sin crear una cuenta."}
          </p>
        )}
      </section>
    </>
  );
}

function AyudaPortada() {
  return (
    <>
      <section className="section support" aria-labelledby="support-title">
        <div>
          <div className="eyebrow">04 / El error es parte del camino</div>
          <h2 id="support-title">
            No tienes que llegar
            <br />
            sabiendo.
          </h2>
          <p>
            syntaxError nació para compartir conocimiento y ayudarte a dar tu
            siguiente paso en tecnología. Puedes preguntar, equivocarte y volver
            a intentarlo.
          </p>
          <Link className="text-link" href="/lun4t1k0">
            Conoce por qué existe syntaxError <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="support-list">
          <article className="support-item">
            <h3>Una pista cuando te trabas.</h3>
            <p>
              Ejercicios con orientación y errores explicados para entender qué
              puedes corregir.
            </p>
          </article>
          <article className="support-item">
            <h3>Un espacio para preguntar.</h3>
            <p>Tutor IA y preguntas al profesor dentro de la plataforma.</p>
          </article>
          <article className="support-item">
            <h3>Proyectos con revisión.</h3>
            <p>
              Recibes observaciones sobre tus entregables para corregirlos y
              volver a enviarlos.
            </p>
          </article>
        </div>
      </section>
      <section className="section faq" aria-labelledby="faq-title">
        <div>
          <div className="eyebrow">$ man syntaxerror</div>
          <h2 id="faq-title">Antes de empezar.</h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>¿De verdad es gratis?</summary>
            <p>
              Sí. syntaxError es una plataforma gratuita para aprender y
              practicar. No necesitas una tarjeta para crear tu cuenta.
            </p>
          </details>
          <details>
            <summary>¿Necesito saber programar?</summary>
            <p>
              No. La ruta empieza desde cero y avanza paso a paso. La ruta
              comienza preparando tu espacio de proyectos en GitHub.
            </p>
          </details>
          <details>
            <summary>¿Puedo hacerlo a mi ritmo?</summary>
            <p>
              Sí. Avanzas por las lecciones y los casos, y puedes retomar tu
              progreso cuando vuelvas.
            </p>
          </details>
          <details>
            <summary>¿Necesito instalar programas?</summary>
            <p>
              Puedes empezar desde el navegador. Más adelante usarás GitHub para
              tus entregables y herramientas como Power BI Desktop para algunas
              actividades. La ruta te indica qué necesitas en cada etapa.
            </p>
          </details>
          <details>
            <summary>¿Puedo estudiar desde el celular?</summary>
            <p>
              Puedes explorar la plataforma desde el celular. Para escribir
              código, trabajar con planillas y preparar tus proyectos, te
              recomendamos un computador.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
