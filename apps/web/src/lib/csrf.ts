import { isAllowedOrigin } from "./cors";

type OriginCheckedRequest = {
  headers: Pick<Headers, "get">;
  nextUrl: {
    origin: string;
  };
};

function originFromReferer(referer: string | null): string | null {
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isRequestOriginAllowed(
  request: OriginCheckedRequest
): boolean {
  const origin =
    request.headers.get("origin") ??
    originFromReferer(request.headers.get("referer"));

  if (!origin) return false;
  return origin === request.nextUrl.origin || isAllowedOrigin(origin);
}
