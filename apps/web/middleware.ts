import { NextResponse, type NextRequest } from "next/server";
import { isRequestOriginAllowed } from "./src/lib/csrf";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const config = { matcher: ["/api/:path*"] };

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/") && !request.nextUrl.pathname.startsWith("/api/auth/register")) {
    return NextResponse.next();
  }
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next();
  if (!isRequestOriginAllowed(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  return NextResponse.next();
}
