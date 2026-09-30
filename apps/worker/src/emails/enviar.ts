import nodemailer, { type Transporter } from "nodemailer";

export type EmailSaliente = { para: string; asunto: string; html: string; texto: string };

let transporte: Transporter | undefined;

function smtp(): Transporter {
  transporte ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporte;
}

async function porResend(email: EmailSaliente, apiKey: string, remitente: string): Promise<void> {
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remitente, to: email.para, subject: email.asunto, html: email.html, text: email.texto }),
  });
  if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}: ${await respuesta.text()}`);
}

// Railway bloquea el SMTP saliente en el plan Hobby: en producción se envía por la API HTTPS de Resend.
// En local se usa SMTP contra Mailpit.
export async function enviarEmail(email: EmailSaliente): Promise<void> {
  const remitente = process.env.EMAIL_FROM;
  if (!remitente) throw new Error("EMAIL_FROM is not set");
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    await porResend(email, apiKey, remitente);
    return;
  }
  await smtp().sendMail({ from: remitente, to: email.para, subject: email.asunto, html: email.html, text: email.texto });
}
