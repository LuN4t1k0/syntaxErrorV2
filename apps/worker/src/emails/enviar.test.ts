import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarEmail } from "../testing/mailpit";
import { enviarEmail } from "./enviar";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("enviarEmail", () => {
  it("sin RESEND_API_KEY envía por SMTP y llega a Mailpit", async () => {
    const para = `smtp-${Date.now()}@correo.cl`;
    await enviarEmail({ para, asunto: "Prueba SMTP", html: "<p>hola</p>", texto: "hola" });
    const recibido = await buscarEmail(para);
    expect(recibido.Subject).toBe("Prueba SMTP");
    expect(recibido.Text.trim()).toBe("hola");
  });

  it("con RESEND_API_KEY usa la API de Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.stubEnv("EMAIL_FROM", "syntaxError.cl <no-responder@syntaxerror.cl>");
    const fetchFalso = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);

    await enviarEmail({ para: "ana@correo.cl", asunto: "Asunto", html: "<p>h</p>", texto: "h" });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer re_prueba");
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "syntaxError.cl <no-responder@syntaxerror.cl>",
      to: "ana@correo.cl",
      subject: "Asunto",
      html: "<p>h</p>",
      text: "h",
    });
  });

  it("un error de Resend se propaga para que BullMQ reintente", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("caído", { status: 500 })));
    await expect(enviarEmail({ para: "ana@correo.cl", asunto: "A", html: "h", texto: "h" })).rejects.toThrow(
      "Resend respondió 500: caído"
    );
  });
});
