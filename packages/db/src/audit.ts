import type { DbClient } from "./client";
import { auditLog } from "./schema";

export const AUDIT_ACTIONS = [
  "login_success",
  "login_failed",
  "logout",
  "email_verified",
  "profile_updated",
  "password_changed",
  "password_reset",
  "email_change_requested",
  "email_changed",
  "data_exported",
  "account_deleted",
  "portfolio_updated",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditTargetType = "user";

export type InsertAuditLogEntryInput = {
  actorId: string | null;
  actorEmail: string | null;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function insertAuditLogEntry(
  db: DbClient,
  input: InsertAuditLogEntryInput
): Promise<void> {
  await db.insert(auditLog).values({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}
