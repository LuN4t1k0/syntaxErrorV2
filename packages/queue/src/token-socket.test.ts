import { describe, expect, it } from "vitest";
import { firmarTokenSocket, verificarTokenSocket } from "./token-socket";

const base = { userId: "u1", clientId: "c1", proposito: "tutor", secreto: "secreto" };

describe("token del socket", () => {
  it("un token recien firmado se verifica y trae el usuario", () => {
    const token = firmarTokenSocket(base);
    expect(verificarTokenSocket({ ...base, token })).toEqual({ userId: "u1" });
  });

  it("no sirve para otro navegador, otro proposito ni con otro secreto", () => {
    const token = firmarTokenSocket(base);
    expect(verificarTokenSocket({ ...base, token, clientId: "c2" })).toBeNull();
    expect(verificarTokenSocket({ ...base, token, proposito: "otro" })).toBeNull();
    expect(verificarTokenSocket({ ...base, token, secreto: "otro-secreto" })).toBeNull();
  });

  it("vence a la hora", () => {
    const token = firmarTokenSocket({ ...base, ahora: 0 });
    expect(verificarTokenSocket({ ...base, token, ahora: 59 * 60 * 1000 })).toEqual({ userId: "u1" });
    expect(verificarTokenSocket({ ...base, token, ahora: 61 * 60 * 1000 })).toBeNull();
  });

  it("rechaza tokens alterados o sin formato", () => {
    const token = firmarTokenSocket(base);
    const [payload, firma] = token.split(".");
    const alterado = `${Buffer.from(JSON.stringify({ userId: "u2", clientId: "c1", proposito: "tutor", expiraEn: Date.now() + 1000 })).toString("base64url")}.${firma}`;
    expect(verificarTokenSocket({ ...base, token: alterado })).toBeNull();
    expect(verificarTokenSocket({ ...base, token: payload })).toBeNull();
    expect(verificarTokenSocket({ ...base, token: "basura" })).toBeNull();
  });
});
