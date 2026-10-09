import { TerminalWindow } from "@/components/terminal-window";

export const metadata = {
  title: "El origen",
  description: "Quién está detrás de syntaxError.cl.",
};

export default function OrigenPage() {
  return (
    <main className="page-container py-16 sm:py-20">
      {/* <p className="section-kicker">Detrás de la consola // El origen del entorno</p>
      <h1 className="page-title mt-3">Quiénes somos</h1> */}

      <div className="mt-0 max-w-7xl">
        <TerminalWindow title="sudo run syntaxerror --quienes-somos">
          <p className="font-mono text-2xl font-black text-foreground">{"> sudo ./run_bio_LuN4t!k0.sh"}</p>

          <div className="mt-6 space-y-1 border-l-4 border-primary bg-primary/10 p-4 font-mono text-sm text-foreground">
            <p>
              <span className="text-accent">[PROFILE]:</span> Cristian Venegas (Ingeniero Informático & Magíster PUC)
            </p>
            <p>
              <span className="text-accent">[ALIAS]:</span> LuN4t!k0 (Code Lover, Maestro Pokemon Nivel 42, Gamer)
            </p>
            <p>
              <span className="text-accent">[LINKEDIN]:</span>{" "}
              <a
                href="https://www.linkedin.com/in/cristian-venegas-595844a2/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                linkedin.com/in/cristian-venegas-595844a2
              </a>
            </p>
          </div>

          <div className="mt-8 space-y-5 leading-relaxed text-foreground">
            <p>
              A primera vista, mi perfil puede parecer el clásico flujo estructurado: Ingeniero Informático con un
              Magíster de la Pontificia Universidad Católica. Pero si excavamos un poco en los logs de mi vida, encuentras
              a <span className="font-bold text-accent">LuN4t!k0</span>, un apasionado que pasa horas frente a la pantalla
              picando código, resolviendo problemas.
            </p>

            <p>
              Creé esta plataforma con una misión directa y sin rodeos:{" "}
              <span className="font-bold text-accent">
                ayudarte a encontrar el camino hacia tu primer trabajo, tu próximo desafío o tu reconversión laboral
                definitiva
              </span>
              . Si estás aquí con dudas, quiero recordarte algo: nunca es muy temprano ni demasiado tarde para subirte a
              este hermoso ecosistema de la informática. Aquí, incluso cuando entiendes exactamente la lógica detrás de cada
              línea y sabes cómo funciona por dentro, sigues sintiendo que la programación es pura magia.
            </p>

            <p>
              Porque programar no es simplemente sentarse a tirar líneas de código en un editor de texto.{" "}
              <span className="font-bold text-success-text">Es el arte de solucionar problemas reales</span>, ya sea para ti o
              para los demás, con el único fin de hacer la vida de las personas más simple. No se trata de automatizar para
              que la humanidad deje de trabajar, sino de liberar su tiempo para que puedan invertirlo en cosas mucho
              mejores.
            </p>

            <p>
              Y aquí es donde entra <span className="text-accent">syntaxError.cl</span>. ¿Por qué elegí este nombre?
              Porque un error de sintaxis es lo más común cuando estás partiendo, pero no es una muralla infranqueable. Es
              solo una señal del sistema que te avisa que algo no va bien y que debes detenerte un segundo a repensar la
              solución. Nada más. A veces programar se siente endiabladamente complicado y frustrante... ¡Y adivina qué! Lo
              es. Es mega frustrante.
            </p>

            <p>
              Por suerte, hoy contamos con el apoyo de la Inteligencia Artificial. Es como tener un ayudante integrado que
              hace todo el trabajo repetitivo por ti. Pero ojo,{" "}
              <span className="font-bold text-accent">siempre hay un &quot;pero&quot;</span>: tú debes saber exactamente
              qué es lo que está haciendo esa máquina. Somos los humanos los que debemos tener siempre la última palabra y
              la decisión final sobre el sistema. Por eso, aquí aprenderás a pensar fuera de la caja, dentro de la caja, al
              lado, arriba, en un círculo, un cuadrado, un grafo o un objeto de forma plástica.
            </p>

            <p>
              Siempre se ha dicho el mito de que los ingenieros (y sobre todo los informáticos) somos seres cuadrados y
              rígidos. Eso es un gran <em>Runtime Error</em>. Nosotros trabajamos sobre lienzos en blanco donde toda la
              creatividad fluye para construir cosas increíbles a partir de la nada.
            </p>

            <p>
              Para cerrar este bloque y volver a lo que nos convoca, quiero dejarte las reglas de este entorno claras de
              inmediato: <span className="font-bold text-accent">esta plataforma es 100% gratuita</span>. Sin trucos, sin
              telemetría oculta y sin vender tus datos a nadie. Es gratis porque yo aprendí en internet gracias a la
              generosidad de muchos entusiastas y creadores de contenido al principio de mi carrera. Ahora que Dios y la
              vida me han dado la oportunidad de crecer, quiero devolver un poco de ese conocimiento a quienes también están
              buscando las herramientas para superarse personal o profesionalmente.
            </p>

            <p>
              Este proyecto está hecho con amor, dedicación y con la firme esperanza de que te sea de máxima utilidad. Si te
              sirve, compártelo para que más personas puedan aprender. Recuerda siempre: el conocimiento no ocupa espacio en
              tu disco duro. Está bien tener dudas y es normal llenarse de preguntas.
            </p>

            <p>
              Como no podré estar físicamente a tu lado en cada momento que te estanques, te dejé configurado un ayudante
              en el entorno: <span className="font-bold text-accent">una pequeña IA disponible las 24 horas</span> para
              resolver tus consultas sobre programación, desarrollo y ciencia de datos.
            </p>

            <p>Un abrazo gigante y dale con todo... ¡Aprende!</p>
          </div>

          <div className="mt-8 space-y-1 border-t border-dashed border-border pt-6 text-foreground">
            <p className="text-success-text">✔ Sistema listo para producción. El conocimiento está libre de bloqueos.</p>
            <p className="mt-3">
              Abrazo virtual,
              <br />
              <strong>LuN4t!k0</strong>
              <br />
              <span className="font-mono font-bold text-accent">
                sudo init success_story
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
              </span>
            </p>
          </div>
        </TerminalWindow>
      </div>
    </main>
  );
}
