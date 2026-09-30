"use client";

import { Printer } from "lucide-react";
import { Button } from "@syntaxerror/ui/components/button";

export function BotonImprimir() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden="true" />
      Imprimir
    </Button>
  );
}
