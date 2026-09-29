import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Entrar",
  description: "Acceso a la plataforma de cursos.",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
