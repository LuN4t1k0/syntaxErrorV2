"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={isLight ? "Usar tema oscuro" : "Usar tema claro"}
      title={isLight ? "Tema oscuro" : "Tema claro"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
    >
      {isLight ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
