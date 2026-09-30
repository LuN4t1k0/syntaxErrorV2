const MAILPIT = process.env.MAILPIT_URL ?? "http://mailpit:8025";

export type EmailRecibido = { asunto: string; texto: string };

export async function esperarEmail(para: string, asunto: string, esperaMs = 20_000): Promise<EmailRecibido> {
  const limite = Date.now() + esperaMs;
  const consulta = encodeURIComponent(`to:"${para}" subject:"${asunto}"`);
  while (Date.now() < limite) {
    const busqueda = await fetch(`${MAILPIT}/api/v1/search?query=${consulta}`);
    const { messages } = (await busqueda.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const detalle = await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`);
      const { Subject, Text } = (await detalle.json()) as { Subject: string; Text: string };
      return { asunto: Subject, texto: Text };
    }
    await new Promise((resolver) => setTimeout(resolver, 500));
  }
  throw new Error(`No llegó el email "${asunto}" a ${para}`);
}

export function rutaDelEnlace(texto: string, ruta: string): string {
  const coincidencia = texto.match(new RegExp(`https?://\\S*${ruta}\\S*`));
  if (!coincidencia) throw new Error(`El email no trae un enlace a ${ruta}`);
  const url = new URL(coincidencia[0]);
  return `${url.pathname}${url.search}`;
}
