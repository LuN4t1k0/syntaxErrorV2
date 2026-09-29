import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

describe("getClientIp", () => {
  it("usa la ultima IP de x-forwarded-for, la que agrega el proxy", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "10.0.0.1" }))).toBe("10.0.0.1");
  });

  it("ignora las IPs que el cliente antepone para saltarse el limite", () => {
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2 , 203.0.113.7" });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("no confia en x-real-ip, que el cliente puede mandar", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("unknown");
  });

  it("devuelve unknown sin headers", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
