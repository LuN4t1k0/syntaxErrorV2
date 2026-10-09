"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { AccesoCard } from "@/components/cuenta/acceso-card";

export function LoginForm() {
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

    try {
      const formData = new FormData(event.currentTarget);
      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
        callbackUrl,
      });

      // next-auth responde ok: true aunque las credenciales fallen; el fallo viene en error/code.
      if (!result || result.error) {
        setError(
          result?.code === "rate_limited"
            ? "Demasiados intentos fallidos. Espera unos minutos y vuelve a intentar."
            : "Email o contraseña incorrectos.",
        );
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
      titulo="Entrar a tu cuenta"
      descripcion="Entra a tu cuenta para seguir donde quedaste."
      etiqueta="Tu espacio para aprender"
    >
      <form className="grid gap-5" onSubmit={onSubmit}>
        <Label>
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <Label>
          Contraseña
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Label>
        <Link
          className="-mt-2 w-fit text-sm font-bold text-accent hover:underline"
          href="/recuperar-clave"
        >
          ¿Olvidaste tu contraseña?
        </Link>
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-error-text"
          >
            {error}
          </p>
        ) : null}
        <Button size="form" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
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
          {googleLoading ? "Abriendo Google..." : "Entrar con Google"}
        </Button>
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            className="font-black text-accent hover:underline"
            href={`/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Crear cuenta
          </Link>
        </p>
      </form>
    </AccesoCard>
  );
}
