import Link from "next/link";

// Lo que ve quien no es probador en una ruta en beta: está publicada, pero todavía no abierta a todos.
export function AvisoBeta({ sesion, volverA, className = "" }: { sesion: boolean; volverA: string; className?: string }) {
  return (
    <p role="status" className={`text-sm leading-6 ${className}`}>
      <span className="badge mr-2">Beta</span>
      Esta ruta está en beta: la están probando algunas personas antes de abrirla a todos. Muy pronto estará disponible.
      {sesion ? null : (
        <>
          {" ¿Eres probador? "}
          <Link className="font-bold text-accent hover:underline" href={`/login?callbackUrl=${encodeURIComponent(volverA)}`}>
            Entra con tu cuenta
          </Link>
          .
        </>
      )}
    </p>
  );
}
