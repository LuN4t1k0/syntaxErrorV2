import Link from "next/link";
import { TerminalWindow } from "@/components/terminal-window";

export const metadata = {
  title: "Términos de Servicio",
  description: "Condiciones de uso de la plataforma syntaxError.cl.",
};

export default function TerminosPage() {
  return (
    <main className="page-container py-16 sm:py-20">
      <p className="section-kicker">Legal</p>
      <h1 className="page-title mt-3">Términos de Servicio</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última actualización: 8 de julio de 2026
      </p>

      <div className="mt-10 max-w-7xl space-y-6">
        <TerminalWindow title="> cat 01_aceptacion.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[ACCEPTANCE]:</span>{" "}
            Al crear una cuenta o usar syntaxError.cl, aceptas estos términos
            y nuestra{" "}
            <Link href="/privacidad" className="text-primary underline">
              Política de Privacidad
            </Link>
            . Si no estás de acuerdo, la plataforma no es para ti -- así de
            simple.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 02_que_es_esto.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[WHAT_IS_THIS]:</span>{" "}
            syntaxError.cl es una plataforma educativa con cursos de
            tecnología -- programación, bases de datos, Excel, y más --
            completamente gratis. El objetivo es acortar la brecha de
            conocimiento para gente que está entrando a tecnología o
            reconvirtiéndose laboralmente.{" "}
            <span className="font-bold text-success">
              Los cursos son gratis y van a seguir siéndolo.
            </span>
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 03_tu_cuenta.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[YOUR_ACCOUNT]:</span>
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-foreground">
            <li>Eres responsable de mantener tu contraseña en secreto.</li>
            <li>Tienes que darnos información real al registrarte.</li>
            <li>
              Si tienes menos de 14 años, necesitas el consentimiento de tu
              representante legal (ver{" "}
              <Link href="/privacidad" className="text-primary underline">
                Política de Privacidad
              </Link>
              ).
            </li>
            <li>
              Puedes eliminar tu cuenta cuando quieras, desde tu perfil --
              sin tener que escribirnos a pedir permiso.
            </li>
          </ul>
        </TerminalWindow>

        <TerminalWindow title="> cat 04_uso_aceptable.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[ACCEPTABLE_USE]:</span>{" "}
            Al usar la plataforma, te comprometes a NO:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-foreground">
            <li>Intentar acceder a cuentas ajenas o a partes del sistema para las que no tienes autorización.</li>
            <li>Usar el chat de IA para generar contenido dañino o ilegal, o intentar manipularlo para que se salga de su propósito educativo.</li>
            <li>Sobrecargar la plataforma a propósito (scripts automatizados, ataques, lo que sea).</li>
            <li>Subir o compartir contenido que infrinja derechos de terceros.</li>
          </ul>
          <p className="mt-3 leading-relaxed text-foreground">
            Rompes alguna de estas reglas y podemos suspender o eliminar tu
            cuenta. No es una amenaza vacía.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 05_propiedad_intelectual.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[IP]:</span>{" "}
            El contenido de los cursos -- material, ejercicios, videos,
            código de ejemplo -- es propiedad de syntaxError.cl o de sus
            autores. Puedes usarlo para tu aprendizaje personal sin problema.
            Lo que no puedes hacer es revenderlo o redistribuirlo
            comercialmente sin autorización.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 06_certificados.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[CERTIFICATES]:</span>{" "}
            Los certificados que emitimos acreditan que completaste un curso
            acá. No son un título profesional oficial ni una garantía de que
            vas a conseguir trabajo -- eso depende de mucho más que un PDF.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 07_disponibilidad.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[UPTIME]:</span>{" "}
            Ofrecemos la plataforma &quot;tal cual&quot; y &quot;según
            disponibilidad&quot;. Es un proyecto educativo gratuito, así que
            no podemos prometer que nunca se va a caer, y el contenido de los
            cursos puede cambiar o actualizarse con el tiempo.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 08_limitacion_responsabilidad.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[LIABILITY]:</span>{" "}
            En la medida que lo permita la ley, no somos responsables por
            daños indirectos derivados de usar o no poder usar la plataforma.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 09_ley_aplicable.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[GOVERNING_LAW]:</span>{" "}
            Estos términos se rigen por las leyes de la República de Chile.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 10_changelog.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[CHANGELOG]:</span>{" "}
            Podemos actualizar estos términos de vez en cuando. Cualquier
            cambio se publica en esta misma página, con fecha nueva.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 11_contacto.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-primary">[CONTACT]:</span>{" "}
            ¿Preguntas sobre estos términos?{" "}
            <a className="text-primary underline" href="mailto:privacidad@syntaxerror.cl">
              privacidad@syntaxerror.cl
            </a>
            .
          </p>
        </TerminalWindow>
      </div>

      <div className="mt-8 max-w-7xl space-y-1 border-t border-dashed border-border pt-6 text-foreground">
        <p className="text-success">
          ✔ 11/11 secciones cargadas sin errores. Estas son las reglas del
          entorno -- cortas, sin trampa.
        </p>
        <p className="mt-3">
          Preguntas:{" "}
          <a className="text-primary underline" href="mailto:privacidad@syntaxerror.cl">
            privacidad@syntaxerror.cl
          </a>
        </p>
        <p className="font-mono font-bold text-primary">
          sudo exit --status=0
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
        </p>
      </div>

      <p className="mt-10">
        <Link href="/privacidad" className="nav-link">
          Ver también: Política de Privacidad →
        </Link>
      </p>
    </main>
  );
}
