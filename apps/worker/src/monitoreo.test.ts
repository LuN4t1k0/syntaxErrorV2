import { describe, expect, it } from "vitest";
import { iniciarMonitoreo, opcionesSentry, reportarError } from "./monitoreo";

describe("monitoreo del worker", () => {
  it("sin DSN no se inicia y reportar un error no falla", () => {
    expect(opcionesSentry(undefined).enabled).toBe(false);
    expect(iniciarMonitoreo(undefined)).toBe(false);
    expect(() => reportarError(new Error("prueba"), { cola: "emails" })).not.toThrow();
  });
});
