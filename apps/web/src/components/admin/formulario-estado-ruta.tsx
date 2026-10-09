"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Confirmacion } from "@/components/confirmacion";
import { enviarJson } from "@/lib/cuenta/cliente";

type Estado = "publicada" | "beta" | "filtrada" | "oculta" | null;

const OPCIONES: { valor: Estado; texto: string }[] = [
  { valor: null, texto: "Volver al estado del contenido" },
  { valor: "publicada", texto: "Publicada" },
  { valor: "beta", texto: "Beta" },
  { valor: "filtrada", texto: "Filtrada" },
  { valor: "oculta", texto: "Oculta" },
];

export function FormularioEstadoRuta({
  slug,
  titulo,
  estadoActual,
  tieneCasos,
}: {
  slug: string;
  titulo: string;
  estadoActual: Estado;
  tieneCasos: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(estadoActual);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setEnviando(true);
    setError(null);
    const respuesta = await enviarJson(`/api/admin/rutas/${slug}`, "PATCH", {
      estado,
    });
    setEnviando(false);
    setConfirmando(false);
    if (respuesta.ok) router.refresh();
    else
      setError(
        respuesta.error === "ruta_sin_casos"
          ? "No se puede publicar una ruta sin casos compilados."
          : "No se pudo cambiar.",
      );
  }

  const destino =
    estado === null ? "vuelve al estado del contenido" : `pasa a ${estado}`;

  return (
    <div className="grid min-w-48 gap-2">
      <select
        aria-label={`Estado de ${titulo}`}
        value={estado ?? ""}
        onChange={(evento) =>
          setEstado((evento.target.value || null) as Estado)
        }
        className="field"
      >
        {OPCIONES.map((opcion) => (
          <option
            key={opcion.valor ?? "contenido"}
            value={opcion.valor ?? ""}
            disabled={
              (opcion.valor === "publicada" || opcion.valor === "beta") &&
              !tieneCasos
            }
          >
            {opcion.texto}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        disabled={enviando || estado === estadoActual}
        onClick={() => setConfirmando(true)}
      >
        Guardar estado
      </Button>
      {error ? (
        <p role="status" className="text-xs font-bold text-error-text">
          {error}
        </p>
      ) : null}
      <Confirmacion
        abierta={confirmando}
        titulo={`Cambiar ${titulo}`}
        descripcion={`${titulo} ${destino}: ${descripcion(estado)}.`}
        confirmar="Cambiar estado"
        onConfirmar={() => void guardar()}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  );
}

function descripcion(estado: Estado): string {
  if (estado === "publicada") return "la ve todo el mundo";
  if (estado === "beta") return "la ven probadores y admins";
  if (estado === "filtrada") return "aparece como filtración sin acceso";
  if (estado === "oculta") return "no aparece en el selector";
  return "se aplica lo que diga el YAML";
}
