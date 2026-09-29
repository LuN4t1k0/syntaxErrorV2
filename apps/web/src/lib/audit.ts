import { headers } from "next/headers";
import type { DbClient } from "@syntaxerror/db/client";
import { insertAuditLogEntry, type AuditAction, type AuditTargetType } from "@syntaxerror/db/audit";

export async function recordAuditEvent(
  db: DbClient,
  input: {
    actorId: string | null;
    actorEmail: string | null;
    action: AuditAction;
    targetType?: AuditTargetType;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const headerList = await headers();
  await insertAuditLogEntry(db, {
    ...input,
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip"),
    userAgent: headerList.get("user-agent"),
  });
}
