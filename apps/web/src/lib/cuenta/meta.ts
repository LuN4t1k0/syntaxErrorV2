import { getClientIp } from "@/lib/client-ip";

export type MetaRequest = { ip: string | null; userAgent: string | null };

export const SIN_META: MetaRequest = { ip: null, userAgent: null };

export function metaDeRequest(request: Request): MetaRequest {
  const ip = getClientIp(request.headers);
  return { ip: ip === "unknown" ? null : ip, userAgent: request.headers.get("user-agent") };
}
