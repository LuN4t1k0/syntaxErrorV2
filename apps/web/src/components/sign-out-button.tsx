"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut size={15} />
      Cerrar sesion
    </button>
  );
}
