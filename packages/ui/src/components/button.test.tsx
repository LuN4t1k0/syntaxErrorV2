import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "./button";

describe("buttonVariants", () => {
  it("usa la variante primary por defecto", () => {
    expect(buttonVariants()).toContain("bg-primary");
  });

  it("deja que className sobrescriba clases de tailwind en conflicto", () => {
    const classes = buttonVariants({ size: "sm", className: "px-8" });
    expect(classes).toContain("px-8");
    expect(classes).not.toContain("px-3");
  });
});

describe("Button", () => {
  it("renderiza un boton con las clases de la variante", () => {
    const html = renderToStaticMarkup(<Button variant="secondary">Entrar</Button>);
    expect(html).toContain("<button");
    expect(html).toContain("bg-surface");
    expect(html).toContain("Entrar");
  });
});
