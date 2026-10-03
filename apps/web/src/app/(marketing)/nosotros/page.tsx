import { TerminalWindow } from "@/components/terminal-window";

export const metadata = {
  title: "Por qué existimos",
  description: "La motivación detrás de syntaxError.cl.",
};

export default function NosotrosPage() {
  return (
    <main className="page-container py-16 sm:py-20">
      <p className="section-kicker">Por qué existimos</p>
      <h1 className="page-title mt-3">Syntax Error no es el fin</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">Es el primer paso para aprender a solucionarlo.</p>

      <div className="mt-10 max-w-3xl">
        <TerminalWindow title="student@syntaxerror: ~/bienvenida.sh">
          <p className="font-mono text-2xl font-black text-foreground">{"> SYNTAX ERROR_"}</p>
          <p className="mt-1 font-mono text-sm text-primary">[ Academia Geek // El arte de aprender rompiendo cosas ]</p>

          <div className="mt-6 border-l-4 border-destructive bg-destructive/10 p-4 font-mono text-sm text-destructive">
            [FATAL ERROR]: El miedo al fracaso ha bloqueado el sistema.
            <br />
            [STATUS]: Recomponiendo el entorno... Listo para compilar de nuevo.
          </div>

          <div className="mt-8 space-y-5 leading-relaxed text-foreground">
            <p>Estimado(a) futuro(a) dev, creador(a) y explorador(a) del código:</p>

            <p>
              Si estás leyendo esto, es probable que te hayas topado con esa pantalla roja o ese mensaje críptico en la
              terminal que te hizo querer cerrar la laptop y cuestionar tus decisiones de vida. Queremos decirte algo
              fundamental: <span className="font-bold text-primary">Bienvenido al club.</span>
            </p>

            <p>
              Cuando fundamos <span className="text-primary">syntaxError.cl</span>, no elegimos el nombre porque fuéramos
              perfectos. Lo elegimos porque entendemos que un error de sintaxis no es un callejón sin salida; es el lenguaje
              que tiene la tecnología para decirte:{" "}
              <em>&quot;Estás cerca, intenta otra perspectiva&quot;</em>. En el mundo geek, el verdadero fracaso no es
              equivocarse, es dejar de presionar <span className="font-bold text-primary">F5</span>.
            </p>

            <p>
              Aquí no venimos a memorizar manuales aburridos ni a fingir que el código compila a la primera. Venimos a
              ensuciarnos las manos, a romper entornos virtuales (controladamente, claro), a descifrar bugs y a celebrar
              cada <span className="font-bold text-success">&quot;Build Success&quot;</span> como si hubiéramos ganado la
              copa del mundo. Cada línea de código que escribas mal es una lección que jamás vas a olvidar.
            </p>

            <p>
              En esta academia vas a aprender a programar, a diseñar, a pensar y a resolver problemas reales. Pero, por
              sobre todo, vas a desarrollar el superpoder más grande de cualquier geek: la{" "}
              <span className="font-bold text-primary">tolerancia a la frustración y la curiosidad insaciable</span>.
            </p>

            <p>
              Tu consola está limpia. El compilador está listo. No le temas al{" "}
              <span className="text-primary">Syntax Error</span>, porque a partir de hoy, ese error es tu maestro más
              honesto.
            </p>
          </div>

          <div className="mt-8 space-y-1 border-t border-dashed border-border pt-6 text-foreground">
            <p className="text-success">✔ El entorno se ha configurado correctamente.</p>
            <p>Prepara tu café, ajusta tu setup y ejecuta tu primer comando.</p>
            <p className="mt-3">
              Atentamente,
              <br />
              <strong>El equipo de syntaxError.cl</strong>
              <br />
              <span className="font-mono font-bold text-primary">
                sudo init learning
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
              </span>
            </p>
          </div>
        </TerminalWindow>

        <p className="mt-3 text-right font-mono text-xs text-muted-foreground">Page 404 Not Found... Just kidding. Page 1 of 1</p>
      </div>
    </main>
  );
}
