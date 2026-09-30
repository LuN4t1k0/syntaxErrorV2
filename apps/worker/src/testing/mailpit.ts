const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://mailpit:8025";

export type EmailMailpit = { ID: string; Subject: string; Text: string; HTML: string };

export async function buscarEmail(para: string, { esperaMs = 10_000 }: { esperaMs?: number } = {}): Promise<EmailMailpit> {
  const limite = Date.now() + esperaMs;
  while (Date.now() < limite) {
    const busqueda = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`);
    const { messages } = (await busqueda.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const mensaje = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`);
      return (await mensaje.json()) as EmailMailpit;
    }
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  throw new Error(`No llegó ningún email a ${para}`);
}
