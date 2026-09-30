"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Card } from "@syntaxerror/ui/components/card";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { ThemeToggle } from "@/components/theme-toggle";

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
            : "Email o password incorrectos."
        );
        return;
      }

      router.push(result.url ?? callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    await signIn("google", { callbackUrl });
  }

  return (
    <Card className="relative w-full max-w-md p-6 shadow-2xl sm:p-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form className="grid gap-5" onSubmit={onSubmit}>
      <div>
        <p className="section-kicker">
          <span className="typographic-glitch subtle-glitch" data-text="auth_gate_">
            auth_gate_
          </span>{" "}
          estudiantes
        </p>
        <h1 className="mt-3 max-w-sm text-3xl font-black leading-tight">
          Entrar a la plataforma
        </h1>
      </div>
      <Label>
        Email
        <Input name="email" type="email" autoComplete="email" required />
      </Label>
      <Label>
        Password
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Label>
      <Link className="-mt-2 w-fit text-sm font-bold text-primary hover:underline" href="/recuperar-clave">
        ¿Olvidaste tu contraseña?
      </Link>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={loading}>
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
        onClick={onGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? "Abriendo Google..." : "Entrar con Google"}
      </Button>
      <p className="text-sm text-muted-foreground">
        No tienes cuenta?{" "}
        <Link
          className="font-black text-primary hover:underline"
          href={`/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          Crear cuenta
        </Link>
      </p>
      </form>
    </Card>
  );
}
