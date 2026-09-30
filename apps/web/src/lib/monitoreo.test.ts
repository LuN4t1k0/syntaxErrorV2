import { describe, expect, it } from "vitest";
import { opcionesSentry } from "./monitoreo";

describe("opcionesSentry", () => {
  it("sin DSN queda apagado", () => {
    expect(opcionesSentry(undefined)).toEqual({ dsn: undefined, enabled: false, tracesSampleRate: 0.1, sendDefaultPii: false });
    expect(opcionesSentry("   ").enabled).toBe(false);
  });

  it("con DSN se enciende con muestreo bajo y sin datos personales", () => {
    expect(opcionesSentry(" https://clave@o1.ingest.sentry.io/2 ")).toEqual({
      dsn: "https://clave@o1.ingest.sentry.io/2",
      enabled: true,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  });
});
