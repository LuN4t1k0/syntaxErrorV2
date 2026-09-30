import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { FormularioClave } from "@/components/cuenta/formulario-clave";
import { FormularioEmail } from "@/components/cuenta/formulario-email";
import { FormularioNombre } from "@/components/cuenta/formulario-nombre";
import { FormularioPortafolio } from "@/components/cuenta/formulario-portafolio";
import { Seccion } from "@/components/cuenta/seccion";
import { SeccionEliminar } from "@/components/cuenta/seccion-eliminar";
import { auth } from "@/lib/auth";
import { obtenerPerfil } from "@/lib/cuenta/perfil";
import { enlacePortafolio } from "@/lib/cuenta/enlaces";
import { sugerirUsuario } from "@/lib/portafolio";

export const metadata = { title: "Tu perfil" };

export default async function PerfilPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login?callbackUrl=/perfil");

  const perfil = await obtenerPerfil(getDb(), userId);
  if (!perfil) redirect("/login?callbackUrl=/perfil");

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> cat ~/.perfil"}</p>
      <h1 className="text-3xl font-black">Tu perfil</h1>

      <Seccion titulo="Datos de la cuenta">
        <p className="text-sm text-muted-foreground">
          Email: <strong className="text-foreground">{perfil.email}</strong>
          {perfil.emailVerificado ? " · confirmado" : ""}
        </p>
        <FormularioNombre nombreActual={perfil.nombre ?? ""} />
      </Seccion>

      <Seccion
        titulo="Cambiar email"
        descripcion="Te enviamos un enlace al email nuevo. El cambio se hace cuando lo confirmas desde ahí."
      >
        <FormularioEmail tieneClave={perfil.tieneClave} />
      </Seccion>

      <Seccion titulo="Cambiar contraseña">
        {perfil.tieneClave ? (
          <FormularioClave />
        ) : (
          <p className="text-sm text-muted-foreground">Entras con Google, así que tu cuenta no tiene contraseña.</p>
        )}
      </Seccion>

      <Seccion titulo="Portafolio público" descripcion="Elige un usuario y decide si quieres mostrar tus casos completados y certificados.">
        <FormularioPortafolio
          publicoActual={perfil.portafolioPublico}
          usuarioActual={perfil.usuario}
          sugerido={sugerirUsuario(perfil.nombre, perfil.email)}
          urlBase={enlacePortafolio("")}
        />
      </Seccion>

      <Seccion
        titulo="Descargar tus datos"
        descripcion="Tienes derecho a acceder a tus datos personales. Descarga en un archivo JSON todo lo que guardamos de ti."
      >
        <a className="btn btn-secondary w-fit" href="/api/cuenta/datos">
          Descargar mis datos
        </a>
      </Seccion>

      <Seccion
        titulo="Eliminar cuenta"
        descripcion="Se borran tu progreso, tus entregables, tus certificados y tu portafolio. No se puede deshacer."
      >
        <SeccionEliminar tieneClave={perfil.tieneClave} />
      </Seccion>
    </main>
  );
}
