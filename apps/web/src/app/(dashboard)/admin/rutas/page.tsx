import { count, countDistinct, eq } from "drizzle-orm";
import { getDb } from "@syntaxerror/db/client";
import { casoInscripciones, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { FormularioEstadoRuta } from "@/components/admin/formulario-estado-ruta";
import { adminDePagina } from "@/lib/admin/acceso";
import { listarRutasConEstado } from "@/lib/rutas/estado";

export const metadata = { title: "Rutas · Administración" };
const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

export default async function AdminRutasPage() {
  await adminDePagina("/admin/rutas");
  const db = getDb();
  const [catalogo, casosPorRuta, elegidas] = await Promise.all([
    listarRutasConEstado(),
    db.select({ rutaId: rutaCasos.rutaId, total: count() }).from(rutaCasos).groupBy(rutaCasos.rutaId),
    db.select({ rutaId: users.rutaElegida, total: count() }).from(users).groupBy(users.rutaElegida),
  ]);
  // Personas distintas con al menos un caso de la ruta empezado, no inscripciones a casos.
  const progreso = await db
    .select({ rutaId: rutaCasos.rutaId, total: countDistinct(casoInscripciones.userId) })
    .from(casoInscripciones)
    .innerJoin(rutaCasos, eq(rutaCasos.casoId, casoInscripciones.casoId))
    .groupBy(rutaCasos.rutaId);

  return (
    <main className="grid gap-6">
      <h1 className="text-3xl font-black">Rutas</h1>
      <p className="max-w-3xl leading-7 text-muted-foreground">Cambia qué rutas ve la gente sin editar contenido ni hacer deploy. El YAML sigue siendo el estado inicial.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-2">Ruta</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Casos</th>
              <th className="p-2">Progreso</th>
              <th className="p-2">Elegida</th>
              <th className="p-2">Cambiar</th>
            </tr>
          </thead>
          <tbody>
            {catalogo.map((ruta) => {
              const id = ruta.id;
              const casos = id ? Number(casosPorRuta.find((fila) => fila.rutaId === id)?.total ?? 0) : ruta.casos.length;
              const personasProgreso = id ? Number(progreso.find((fila) => fila.rutaId === id)?.total ?? 0) : 0;
              const personasElegida = id ? Number(elegidas.find((fila) => fila.rutaId === id)?.total ?? 0) : 0;
              return (
                <tr key={ruta.slug} className="border-b border-border align-top">
                  <td className="p-2">
                    <span className="block font-bold">{ruta.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{ruta.slug}</span>
                  </td>
                  <td className="p-2">
                    <span className="badge">{ruta.estadoVigente}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {ruta.estadoAdmin
                        ? `cambiado por ${ruta.estadoCambiadoPorEmail ?? "un admin"}${ruta.estadoCambiadoEn ? ` el ${fecha(ruta.estadoCambiadoEn)}` : ""}`
                        : "del contenido"}
                    </span>
                  </td>
                  <td className="p-2">{casos}</td>
                  <td className="p-2">{personasProgreso}</td>
                  <td className="p-2">{personasElegida}</td>
                  <td className="p-2">
                    {ruta.estado === "borrador" ? (
                      <span className="text-muted-foreground">en desarrollo en el repositorio</span>
                    ) : (
                      <FormularioEstadoRuta slug={ruta.slug} titulo={ruta.titulo} estadoActual={(ruta.estadoAdmin ?? null) as "publicada" | "beta" | "filtrada" | "oculta" | null} tieneCasos={casos > 0} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
