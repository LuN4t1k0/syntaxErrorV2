import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./cors";
import { isRequestOriginAllowed } from "./csrf";

function request(origin: string | null, host = "localhost:3000", referer?: string) {
  const headers = new Headers(origin ? { origin, host } : { host });
  if (referer) headers.set("referer", referer);
  return { headers, nextUrl: { origin: "http://localhost:3000" } };
}

describe("isAllowedOrigin", () => {
  it("acepta origen local permitido", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
  });

  it("rechaza origen externo", () => {
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  it("rechaza null", () => {
    expect(isAllowedOrigin(null)).toBe(false);
  });
});

describe("isRequestOriginAllowed", () => {
  it("acepta request con origin permitido", () => {
    expect(isRequestOriginAllowed(request("http://localhost:3000"))).toBe(true);
  });

  it("rechaza request con origin externo", () => {
    expect(isRequestOriginAllowed(request("https://evil.example"))).toBe(false);
  });

  it("usa referer si no hay origin", () => {
    expect(isRequestOriginAllowed(request(null, "localhost:3000", "http://localhost:3000/registro"))).toBe(true);
  });
});
