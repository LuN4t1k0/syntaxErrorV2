import { describe, expect, it } from "vitest";
import { construirCsp } from "./csp";

function directiva(csp: string, nombre: string): string {
  return csp.split("; ").find((parte) => parte.startsWith(`${nombre} `)) ?? "";
}

describe("construirCsp", () => {
  it("sin motores no permite eval ni el CDN", () => {
    const csp = construirCsp({ motores: false, socket: "" });
    expect(directiva(csp, "script-src")).toBe("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("cdn.jsdelivr.net");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("con motores permite alasql, WebAssembly y Pyodide desde jsDelivr", () => {
    const csp = construirCsp({ motores: true, socket: "" });
    expect(directiva(csp, "script-src")).toBe(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net"
    );
    expect(directiva(csp, "connect-src")).toBe("connect-src 'self' https://cdn.jsdelivr.net");
    expect(directiva(csp, "worker-src")).toBe("worker-src 'self' blob:");
  });

  it("agrega el socket del worker en http y ws", () => {
    const csp = construirCsp({ motores: false, socket: "http://localhost:4001" });
    expect(directiva(csp, "connect-src")).toBe("connect-src 'self' http://localhost:4001 ws://localhost:4001");
  });
});
