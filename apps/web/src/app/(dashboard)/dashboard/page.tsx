import { auth } from "@/lib/auth";

export const metadata = { title: "Tu panel" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-sm font-bold text-primary">{"> whoami"}</p>
      <h1 className="text-3xl font-black">Hola, {name}</h1>
      <p className="max-w-2xl leading-7 text-muted-foreground">
        Aquí vas a ver tus casos en curso, tus entregables y tus certificados.
      </p>
    </main>
  );
}
