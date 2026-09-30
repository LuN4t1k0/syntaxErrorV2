import Link from "next/link";

const STEPS = [
  {
    tag: "01_caso",
    title: "Un trabajo real, no un temario",
    body: "Cada curso es un caso de una empresa ficticia chilena. Llegas como junior y te piden resultados.",
  },
  {
    tag: "02_misiones",
    title: "Resuelves en herramientas de verdad",
    body: "SQL, Python, planillas y terminal corren en tu navegador. Cada misión se valida al instante.",
  },
  {
    tag: "03_portafolio",
    title: "Terminas con evidencia",
    body: "Cada caso deja un entregable para tu GitHub y un certificado verificable para tu CV.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <p className="font-mono text-sm font-bold text-primary">SYNTAXERROR_ / v2.0</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
          Aprende resolviendo casos reales y consigue tu primer trabajo en tecnología
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
          Academia 100% gratuita. Sin videos eternos ni quizzes de memoria: practicas con datos y
          herramientas reales desde tu navegador y armas un portafolio que puedes mostrar.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/registro" className="btn btn-primary">
            Crear cuenta gratis
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Ya tengo cuenta
          </Link>
          <Link href="/rutas" className="btn btn-secondary">
            Ver rutas
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
        {STEPS.map((step) => (
          <article key={step.tag} className="card grid gap-3 p-6">
            <span className="font-mono text-xs font-bold text-primary">{step.tag}</span>
            <h2 className="text-xl font-black">{step.title}</h2>
            <p className="leading-7 text-muted-foreground">{step.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
