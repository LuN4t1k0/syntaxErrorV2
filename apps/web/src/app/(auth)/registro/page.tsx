import { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export const metadata = {
  title: "Crear cuenta",
  description: "Registro de estudiante.",
};

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
