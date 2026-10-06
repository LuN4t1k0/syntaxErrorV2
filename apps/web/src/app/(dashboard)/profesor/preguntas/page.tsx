import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EVENTO_PREGUNTA_NUEVA } from "@syntaxerror/queue/eventos";
import { Paginacion } from "@/components/admin/paginacion";
import { RefrescarConAvisos } from "@/components/avisos/refrescar-con-avisos";
import { ListaPreguntas } from "@/components/comunidad/lista-preguntas";
import { leerPagina } from "@/lib/admin/paginacion";
import { paginaPreguntasParaDocente } from "@/lib/preguntas-profesor";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Preguntas de estudiantes" };

const VISTAS = [
  { valor: undefined, texto: "Todas" },
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "respondida", texto: "Respondidas" },
] as const;

export default async function PreguntasDocentePage({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor/preguntas");
  if (!esDocente(usuario)) notFound();
  const parametros = await searchParams;
  const estado = parametros.estado === "pendiente" || parametros.estado === "respondida" ? parametros.estado : undefined;
  const resultado = await paginaPreguntasParaDocente(getDb(), usuario, { estado, pagina: leerPagina(parametros.pagina) });
  const preguntas = resultado.filas;
  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-12 sm:px-6">
      <RefrescarConAvisos eventos={[EVENTO_PREGUNTA_NUEVA]} />
      <nav className="text-sm" aria-label="Volver al panel docente"><Link className="font-bold text-primary hover:underline" href="/profesor">← Panel docente</Link></nav>
      <p className="font-mono text-sm font-bold text-primary">{"> git pull origin preguntas"}</p>
      <h1 className="text-3xl font-black">Preguntas de estudiantes</h1>
      <p className="leading-7 text-muted-foreground">
        {usuario.rol === "admin"
          ? "Ves las preguntas de tus clases y las de estudiantes sin docente asignado."
          : "Ves las preguntas de estudiantes de tus clases sobre los casos habilitados."}
      </p>
      <nav className="flex flex-wrap gap-4 text-sm" aria-label="Estado de las preguntas">
        {VISTAS.map((vista) => (
          <Link
            key={vista.texto}
            href={vista.valor ? `/profesor/preguntas?estado=${vista.valor}` : "/profesor/preguntas"}
            aria-current={estado === vista.valor ? "page" : undefined}
            className={estado === vista.valor ? "font-bold text-foreground" : "font-bold text-primary hover:underline"}
          >
            {estado === vista.valor ? `${vista.texto} (${resultado.total})` : vista.texto}
          </Link>
        ))}
      </nav>
      {preguntas.length === 0 ? <p className="text-muted-foreground">No hay preguntas por ahora.</p> : <ListaPreguntas preguntas={preguntas} modo="docente" />}
      <Paginacion ruta="/profesor/preguntas" parametros={estado ? { estado } : {}} pagina={resultado.pagina} paginas={resultado.paginas} />
    </main>
  );
}
