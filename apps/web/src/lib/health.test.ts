import { afterAll, describe, expect, it } from "vitest";
import { createTestDb } from "@syntaxerror/db/testing";
import { checkHealth } from "./health";

const { db, close } = createTestDb();

describe("checkHealth", () => {
  afterAll(() => close());

  it("reporta ok cuando responden la base y redis", async () => {
    const redis = { ping: async () => "PONG" };
    expect(await checkHealth({ db, redis })).toEqual({ ok: true, db: true, redis: true });
  });

  it("reporta el componente caido sin lanzar", async () => {
    const redis = { ping: async () => { throw new Error("ECONNREFUSED"); } };
    expect(await checkHealth({ db, redis })).toEqual({ ok: false, db: true, redis: false });
  });
});
