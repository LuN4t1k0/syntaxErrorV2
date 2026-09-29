import { NextResponse } from "next/server";

const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function configuredOrigins(): string[] {
  return (process.env.PLATFORM_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  return LOCAL_ORIGIN_RE.test(origin) || configuredOrigins().includes(origin);
}

export function withCors(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export function corsPreflight(request: Request) {
  const response = new NextResponse(null, { status: 204 });
  const origin = request.headers.get("origin");
  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Vary", "Origin");
  }
  return response;
}
