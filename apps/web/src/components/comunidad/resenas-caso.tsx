"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";
import type { MiResena, ResumenResenas } from "@/lib/resenas";

type Datos = ResumenResenas & { mia: MiResena };

const estrellasTexto = (cantidad: number) => `${"★".repeat(cantidad)}${"☆".repeat(5 - cantidad)}`;

export function ResenasCaso({ caso }: { caso: string }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const respuesta = await fetch(`/api/resenas?caso=${encodeURIComponent(caso)}`, { cache: "no-store" }).catch(() => null);
    if (respuesta?.ok) setDatos((await respuesta.json()) as Datos);
  }, [caso]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function publicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estrellas === 0) {
      setAviso("Elige de 1 a 5 estrellas.");
      return;
    }
    setEnviando(true);
    const texto = comentario.trim();
    const respuesta = await enviarJson("/api/resenas", "POST", { caso, estrellas, ...(texto ? { comentario: texto } : {}) });
    setEnviando(false);
    if (!respuesta.ok) {
      setAviso("No pudimos publicar tu reseña. Intenta de nuevo.");
      return;
    }
    setAviso(texto ? "Gracias. Tu comentario se publicará cuando lo revisemos." : "Gracias por tu reseña.");
    await cargar();
  }

  if (!datos) return null;
  const { mia } = datos;

  return (
    <section className="card grid gap-4 p-5" aria-labelledby="titulo-resenas">
      <h2 id="titulo-resenas" className="text-xl font-black">Reseñas</h2>
      {datos.cantidad === 0 ? (
        <p className="text-muted-foreground">Todavía no hay reseñas de este caso.</p>
      ) : (
        <p className="font-bold">{`★ ${datos.promedio.toLocaleString("es-CL")} de 5 · ${datos.cantidad} ${datos.cantidad === 1 ? "reseña" : "reseñas"}`}</p>
      )}
      {datos.comentarios.length > 0 ? (
        <ul className="grid gap-3">
          {datos.comentarios.map((resena) => (
            <li key={resena.id} className="grid gap-1 border-t border-border pt-3">
              <p className="text-sm">
                <span className="font-bold">{resena.nombre}</span> <span aria-label={`${resena.estrellas} de 5 estrellas`}>{estrellasTexto(resena.estrellas)}</span>
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{resena.comentario}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {mia.estado === "no_completado" ? <p className="text-sm text-muted-foreground">Cuando completes el caso podrás dejar tu reseña.</p> : null}
      {mia.estado === "ya_reseno" ? (
        <p className="text-sm">
          {`Tu reseña: ${mia.estrellas} de 5.`}
          {mia.estadoComentario === "pendiente" ? " Tu comentario se publicará cuando lo revisemos." : null}
        </p>
      ) : null}
      {mia.estado === "puede_resenar" ? (
        <form className="grid gap-3" onSubmit={publicar}>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-bold">Tu nota</legend>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((valor) => (
                <label key={valor} className="flex items-center gap-1 text-sm">
                  <input type="radio" name="estrellas" value={valor} checked={estrellas === valor} onChange={() => setEstrellas(valor)} />
                  {valor === 1 ? "1 estrella" : `${valor} estrellas`}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 text-sm font-bold">
            Comentario (opcional)
            <textarea
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
            />
          </label>
          <div>
            <Button type="submit" disabled={enviando}>Publicar reseña</Button>
          </div>
        </form>
      ) : null}
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </section>
  );
}
