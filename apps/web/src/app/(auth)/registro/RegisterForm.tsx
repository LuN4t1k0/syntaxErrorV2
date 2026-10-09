"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { AccesoCard } from "@/components/cuenta/acceso-card";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email,
          password,
        }),
      });

      if (!response.ok) {
        setError(
          response.status === 409
            ? "Ese email ya está registrado."
            : "No se pudo crear la cuenta.",
        );
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      router.push(result.url ?? callbackUrl);
    } catch {
      setError("No pudimos conectar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("No pudimos abrir Google. Intenta de nuevo.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AccesoCard
      titulo="Crear cuenta"
      descripcion="Tu cuenta es gratis. Aprende practicando y guarda cada paso de tu avance."
      etiqueta="Empieza por una oportunidad"
    >
      <form className="grid gap-5" onSubmit={onSubmit}>
        <Label>
          Nombre
          <Input name="name" type="text" autoComplete="name" required />
        </Label>
        <Label>
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <Label>
          Contraseña
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            aria-describedby="clave-ayuda"
            required
          />
        </Label>
        <p id="clave-ayuda" className="-mt-3 text-xs text-muted-foreground">
          Usa al menos 8 caracteres.
        </p>
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-error-text"
          >
            {error}
          </p>
        ) : null}
        <Button size="form" type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear cuenta gratis"}
        </Button>
        <div className="flex items-center gap-3 text-xs font-bold uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          o
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="form"
          onClick={onGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? "Abriendo Google..." : "Registrarse con Google"}
        </Button>
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link
            className="font-black text-accent hover:underline"
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Entrar
          </Link>
        </p>
      </form>
    </AccesoCard>
  );
}
