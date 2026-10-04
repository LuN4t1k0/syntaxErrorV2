import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { generarCertificadoPdf } from "@/lib/certificados/pdf";
import { buscarCertificado } from "@/lib/certificados/servicio";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const limite = await checkRateLimit("certificado-pdf", getClientIp(request.headers));
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }

  const { codigo } = await params;
  const certificado = await buscarCertificado(getDb(), codigo);
  if (!certificado) return NextResponse.json({ error: "no_encontrado" }, { status: 404 });

  const pdf = await generarCertificadoPdf(certificado, siteConfig.url);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${certificado.codigo}.pdf"`,
    },
  });
}
