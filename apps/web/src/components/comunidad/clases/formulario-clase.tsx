"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioClase({ rutas }: { rutas: { slug: string; titulo: string }[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [ruta, setRuta] = useState(rutas[0]?.slug ?? "");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson("/api/profesor/clases", "POST", { titulo, ruta });
    setEnviando(false);
    if (respuesta.ok && typeof respuesta.datos.id === "string") {
      router.push(`/profesor/clases/${respuesta.datos.id}`);
      return;
    }
    setAviso("No pudimos crear la clase. Revisa el nombre y la ruta.");
  }

  if (rutas.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay rutas publicadas para asignar.</p>;

  return (
    <form className="grid gap-3" onSubmit={crear}>
      <Label>
        Nombre de la clase
        <Input name="titulo" value={titulo} onChange={(evento) => setTitulo(evento.target.value)} required maxLength={120} placeholder="Por ejemplo: 4°B Analítica 2026" />
      </Label>
      <Label>
        Ruta
        <select
          name="ruta"
          value={ruta}
          onChange={(evento) => setRuta(evento.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground"
        >
          {rutas.map((opcion) => (
            <option key={opcion.slug} value={opcion.slug}>{opcion.titulo}</option>
          ))}
        </select>
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>Crear clase</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
