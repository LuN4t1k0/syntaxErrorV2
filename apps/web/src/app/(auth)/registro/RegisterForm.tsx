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
      setLoading(false);
      setError(
        response.status === 409
          ? "Ese email ya esta registrado."
          : "No se pudo crear la cuenta."
      );
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
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
        <p className="section-kicker">Nueva cuenta</p>
        <h1 className="mt-3 text-3xl font-black">Crear cuenta</h1>
      </div>
      <Label>
        Nombre
        <Input name="name" type="text" autoComplete="name" required />
      </Label>
      <Label>
        Email
        <Input name="email" type="email" autoComplete="email" required />
      </Label>
      <Label>
        Password
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Label>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Creando..." : "Crear y entrar"}
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
        {googleLoading ? "Abriendo Google..." : "Registrarse con Google"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Ya tienes cuenta?{" "}
        <Link
          className="font-black text-primary hover:underline"
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          Entrar
        </Link>
      </p>
      </form>
    </Card>
  );
}
