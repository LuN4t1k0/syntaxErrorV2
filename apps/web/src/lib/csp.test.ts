import { describe, expect, it } from "vitest";
import { construirCsp } from "./csp";

describe("construirCsp", () => {
  it("solo las misiones habilitan motores", () => {
    expect(construirCsp({ motores: false, socket: "" })).not.toContain("unsafe-eval");
    expect(construirCsp({ motores: true, socket: "" })).toContain("'wasm-unsafe-eval' https://cdn.jsdelivr.net");
  });
});
