import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { insertAuditLogEntry } from "./audit";
import { auditLog } from "./schema";
import { createTestDb, truncateAll } from "./testing";

const { db, close } = createTestDb();

describe("insertAuditLogEntry", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("guarda la accion con metadata vacia por defecto", async () => {
    await insertAuditLogEntry(db, {
      actorId: null,
      actorEmail: "ana@correo.cl",
      action: "login_failed",
      ipAddress: "10.0.0.1",
    });

    const rows = await db.select().from(auditLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorEmail: "ana@correo.cl",
      action: "login_failed",
      metadata: {},
      ipAddress: "10.0.0.1",
      userAgent: null,
    });
  });
});
