"use client";

import { useEffect } from "react";
import { dependenciasNavegador, sincronizarPendientes } from "@/lib/progreso/cliente";

export function SincronizarProgreso() {
  useEffect(() => {
    void sincronizarPendientes(dependenciasNavegador());
  }, []);
  return null;
}
