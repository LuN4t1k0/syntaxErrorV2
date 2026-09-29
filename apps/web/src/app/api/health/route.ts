import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { checkHealth } from "@/lib/health";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await checkHealth({ db: getDb(), redis: getRedis() });
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
