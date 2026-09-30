export type LineaEstado = { etiqueta: "INFO" | "WARNING" | "ERROR"; mensaje: string };

export type EntradaPlantilla = {
  asunto: string;
  estado: LineaEstado;
  saludo: string;
  parrafos: string[];
  enlace?: { texto: string; url: string };
  comandoCierre: string;
};

export type EmailListo = { asunto: string; html: string; texto: string };

const PREFIJO = "syntaxError.cl — ";
const FIRMA = ["Un saludo,", "El equipo de syntaxError.cl"];
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

const TONOS: Record<LineaEstado["etiqueta"], { borde: string; fondo: string; texto: string }> = {
  ERROR: { borde: "#ef4444", fondo: "#fef2f2", texto: "#b91c1c" },
  WARNING: { borde: "#f59e0b", fondo: "#fffbeb", texto: "#b45309" },
  INFO: { borde: "#a1a1aa", fondo: "#f4f4f5", texto: "#52525b" },
};

export function escaparHtml(valor: string): string {
  return valor.replace(
    /[&<>"']/g,
    (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]!
  );
}

function fila(contenido: string, estilo: string): string {
  return `<tr><td style="${estilo}">${contenido}</td></tr>`;
}

function renderHtml(entrada: EntradaPlantilla): string {
  const tono = TONOS[entrada.estado.etiqueta];
  const estado = fila(
    `[${escaparHtml(entrada.estado.etiqueta)}]: ${escaparHtml(entrada.estado.mensaje)}`,
    `padding:10px 12px;border-left:3px solid ${tono.borde};background:${tono.fondo};font-family:${MONO};font-size:12.5px;line-height:1.6;color:${tono.texto};`
  );
  const saludo = fila(
    escaparHtml(entrada.saludo),
    `padding:16px 0 14px;font-family:${SANS};font-size:15px;line-height:1.6;color:#18181b;`
  );
  const parrafos = entrada.parrafos
    .map((parrafo) =>
      fila(escaparHtml(parrafo), `padding:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.7;color:#52525b;`)
    )
    .join("");
  const enlace = entrada.enlace
    ? fila(
        `<a href="${escaparHtml(entrada.enlace.url)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-family:${SANS};font-size:14px;font-weight:700;padding:10px 18px;border-radius:6px;">${escaparHtml(entrada.enlace.texto)}</a><br><span style="display:inline-block;margin-top:10px;font-family:${MONO};font-size:11px;color:#71717a;word-break:break-all;">${escaparHtml(entrada.enlace.url)}</span>`,
        "padding:4px 0 18px;"
      )
    : "";
  const firma = fila(
    `${FIRMA.map(escaparHtml).join("<br>")}<br><span style="display:inline-block;margin-top:6px;background:#f4f4f5;color:#7c3aed;padding:2px 8px;border-radius:4px;font-family:${MONO};font-size:12px;">${escaparHtml(entrada.comandoCierre)}</span>`,
    `padding:10px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:#a1a1aa;`
  );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escaparHtml(PREFIJO + entrada.asunto)}</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;">
<tr><td style="padding:0 0 16px;font-family:${MONO};font-size:13px;color:#7c3aed;letter-spacing:0.5px;">&gt; syntaxError.cl_</td></tr>
<tr><td style="border:1px solid #e4e4e7;border-radius:8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:#f4f4f5;border-bottom:1px solid #e4e4e7;padding:10px 16px;border-radius:8px 8px 0 0;font-family:${MONO};font-size:11px;color:#71717a;">
<span style="color:#ff5f56;">&#9679;</span> <span style="color:#ffbd2e;">&#9679;</span> <span style="color:#27c93f;">&#9679;</span>&nbsp; estudiante@syntaxerror: ~
</td></tr>
<tr><td style="padding:28px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${estado}
${saludo}
${parrafos}
${enlace}
${firma}
</table>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderTexto(entrada: EntradaPlantilla): string {
  const partes = [`[${entrada.estado.etiqueta}]: ${entrada.estado.mensaje}`, "", entrada.saludo];
  for (const parrafo of entrada.parrafos) partes.push("", parrafo);
  if (entrada.enlace) partes.push("", `${entrada.enlace.texto}: ${entrada.enlace.url}`);
  partes.push("", ...FIRMA, entrada.comandoCierre);
  return partes.join("\n");
}

export function plantillaSyntaxError(entrada: EntradaPlantilla): EmailListo {
  return { asunto: PREFIJO + entrada.asunto, html: renderHtml(entrada), texto: renderTexto(entrada) };
}
