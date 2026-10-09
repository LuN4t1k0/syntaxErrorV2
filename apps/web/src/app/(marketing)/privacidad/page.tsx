import Link from "next/link";
import { TerminalWindow } from "@/components/terminal-window";

export const metadata = {
  title: "Política de Privacidad",
  description: "Cómo syntaxError.cl recolecta, usa y protege tus datos personales.",
};

export default function PrivacidadPage() {
  return (
    <main className="page-container py-16 sm:py-20">
      <p className="section-kicker">Legal</p>
      <h1 className="page-title mt-3">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última actualización: 8 de julio de 2026
      </p>

      <div className="mt-10 max-w-7xl space-y-6">
        <TerminalWindow title="> cat 01_responsable.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[OWNER]:</span>{" "}
            syntaxError.cl no es una corporación con un departamento legal de
            40 personas -- lo opera Cristian Venegas, una persona natural,
            como proyecto educativo sin fines de lucro. Si tienes dudas sobre
            esta política o quieres ejercer tus derechos, el canal es uno
            solo:{" "}
            <a className="text-accent underline" href="mailto:privacidad@syntaxerror.cl">
              privacidad@syntaxerror.cl
            </a>
            . Sin bots, sin IVR -- te responde una persona.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 02_que_datos_recolectamos.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[DATA_COLLECTED]:</span>{" "}
            Recolectamos lo que nos das directamente y lo que se genera solo
            con usar la plataforma:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-foreground">
            <li>
              <span className="font-mono text-accent">[cuenta]</span> nombre,
              correo, y un hash de tu contraseña si te registras con
              credenciales. Si entras con Google, nos llega tu nombre y
              correo desde ahí -- nunca tu contraseña de Google.
            </li>
            <li>
              <span className="font-mono text-accent">[progreso]</span> los
              cursos y rutas de aprendizaje en los que te inscribes, tu
              avance lección por lección, los certificados que obtienes, y
              los puntos que acumulas.
            </li>
            <li>
              <span className="font-mono text-accent">[social]</span> tu
              participación en clases (si un profesor te invita), solicitudes
              para ser profesor, y las reseñas que dejas en los cursos.
            </li>
            <li>
              <span className="font-mono text-accent">[chat_ia]</span> el
              texto de lo que le preguntas a nuestro asistente educativo y
              las respuestas que te da.
            </li>
            <li>
              <span className="font-mono text-accent">[seguridad]</span> tu
              IP, tu user agent, y un log de las acciones sensibles de tu
              cuenta (login, cambios de clave o correo, borrado de cuenta) --
              para protegerte a ti y a la plataforma contra accesos
              indebidos.
            </li>
          </ul>
        </TerminalWindow>

        <TerminalWindow title="> cat 03_para_que_los_usamos.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[PURPOSE]:</span>{" "}
            Usamos tus datos para que la plataforma funcione, nada más:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-foreground">
            <li>Darte acceso a los cursos y llevar registro de tu progreso y certificados.</li>
            <li>Permitir la interacción entre estudiantes y profesores dentro de una clase.</li>
            <li>Responder tus preguntas a través del chat de IA.</li>
            <li>Enviarte correos operativos: bienvenida, confirmación de cambios en tu cuenta, notificaciones de tus clases.</li>
            <li>Proteger tu cuenta y la plataforma: detectar y prevenir accesos indebidos, fraude o abuso.</li>
            <li>Cumplir obligaciones legales, cuando corresponda.</li>
          </ul>
          <p className="mt-3 leading-relaxed text-foreground">
            <span className="font-bold text-success-text">
              No usamos tus datos para publicidad, no los vendemos, y no
              metemos Google Analytics ni píxeles de rastreo de nadie en la
              plataforma.
            </span>
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 04_con_quien_compartimos.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[THIRD_PARTIES]:</span>{" "}
            Trabajamos con 3 proveedores para que esto funcione, cada uno con
            acceso solo a lo que necesita para su parte:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-foreground">
            <li>
              <span className="font-mono text-accent">[Google]</span> si
              entras con &quot;Iniciar sesión con Google&quot; (autenticación),
              y para generar las respuestas del chat de IA (recibe el texto
              de tu pregunta, no tu identidad).
            </li>
            <li>
              <span className="font-mono text-accent">[Resend]</span> para
              el envío de correos transaccionales: bienvenida, cambios de
              cuenta, notificaciones.
            </li>
            <li>
              <span className="font-mono text-accent">[Railway]</span>{" "}
              nuestro proveedor de hosting, donde vive la base de datos con
              tu información.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed text-foreground">
            No compartimos tus datos con nadie más para fines publicitarios,
            y no los vendemos bajo ninguna circunstancia -- eso no está en
            discusión.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 05_transferencia_internacional.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[INTL_TRANSFER]:</span>{" "}
            Nuestra infraestructura (Railway) procesa y guarda datos en
            servidores en Estados Unidos. Al usar la plataforma, tus datos
            salen de Chile -- es la realidad técnica de correr esto con los
            proveedores que usamos. Trabajamos únicamente con proveedores que
            aplican estándares de seguridad reconocidos internacionalmente.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 06_retencion.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[RETENTION]:</span>{" "}
            Guardamos tus datos de cuenta mientras la cuenta esté activa. Si
            pides eliminarla, tus datos personales se borran de forma
            permanente e inmediata de la base de datos -- no es un
            &quot;borrado lógico&quot; que sigue ahí escondido, es un{" "}
            <span className="font-mono font-bold text-accent">DELETE</span>{" "}
            real.
          </p>
          <p className="mt-3 leading-relaxed text-foreground">
            La única excepción es el log de auditoría (seguridad): por diseño
            no queda enganchado a tu cuenta eliminada, y se conserva de forma
            independiente hasta 365 días desde que se generó, solo para
            fines de seguridad. Después de eso, se borra automáticamente.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 07_tus_derechos.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[YOUR_RIGHTS]:</span>{" "}
            Bajo la Ley 21.719 tienes los derechos ARCOP: Acceder, Rectificar,
            Cancelar y Oponerte al tratamiento de tus datos, más el derecho a
            la Portabilidad. Puedes ejercerlos directo desde tu perfil
            (exportar tus datos, cambiar tu nombre o correo, eliminar tu
            cuenta) o escribiendo a{" "}
            <a className="text-accent underline" href="mailto:privacidad@syntaxerror.cl">
              privacidad@syntaxerror.cl
            </a>
            .
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 08_menores_de_edad.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[MINORS]:</span>{" "}
            Si tienes menos de 14 años, necesitas el consentimiento de tu
            papá, mamá o representante legal para usar la plataforma y para
            que tratemos tus datos. Si nos enteramos de que recolectamos
            datos de un menor de esa edad sin ese consentimiento, los
            eliminamos.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 09_seguridad.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[SECURITY]:</span>{" "}
            Lo básico, bien hecho: contraseñas cifradas, conexiones por
            HTTPS, límites de intentos en operaciones sensibles (login,
            cambio de contraseña), y un log de auditoría de las acciones
            relevantes de tu cuenta.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 10_changelog.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[CHANGELOG]:</span>{" "}
            Podemos actualizar esta política de vez en cuando. Cualquier
            cambio se publica en esta misma página, con una fecha de
            actualización nueva -- sin letra chica escondida en otro lado.
          </p>
        </TerminalWindow>

        <TerminalWindow title="> cat 11_contacto.sh">
          <p className="leading-relaxed text-foreground">
            <span className="font-mono font-bold text-accent">[CONTACT]:</span>{" "}
            ¿Dudas sobre esta política o sobre qué hacemos con tus datos?{" "}
            <a className="text-accent underline" href="mailto:privacidad@syntaxerror.cl">
              privacidad@syntaxerror.cl
            </a>
            . Ya lo dijimos arriba, pero vale repetirlo: te responde una
            persona, no un ticket que se pierde en una cola.
          </p>
        </TerminalWindow>
      </div>

      <div className="mt-8 max-w-7xl space-y-1 border-t border-dashed border-border pt-6 text-foreground">
        <p className="text-success-text">
          ✔ 11/11 secciones cargadas sin errores. Ahora sabes exactamente qué
          hacemos con tus datos -- y qué no.
        </p>
        <p className="mt-3">
          Cualquier duda, ya sabes:{" "}
          <a className="text-accent underline" href="mailto:privacidad@syntaxerror.cl">
            privacidad@syntaxerror.cl
          </a>
        </p>
        <p className="font-mono font-bold text-accent">
          sudo exit --status=0
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
        </p>
      </div>

      <p className="mt-10">
        <Link href="/terminos" className="nav-link">
          Ver también: Términos de Servicio →
        </Link>
      </p>
    </main>
  );
}
