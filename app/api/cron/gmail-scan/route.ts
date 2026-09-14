import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runScanForConnection } from "@/lib/gmail/scan";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("gmail_connections")
    .select("id, user_id")
    .eq("status", "connected");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const conn of connections ?? []) {
    try {
      const result = await runScanForConnection(conn.id, conn.user_id);
      results.push({ connectionId: conn.id, ...result });
    } catch (err) {
      results.push({
        connectionId: conn.id,
        error: err instanceof Error ? err.message : "scan failed",
      });
      // Mark the connection as errored so it surfaces in Settings rather
      // than silently retrying forever (e.g. a revoked refresh token).
      await admin
        .from("gmail_connections")
        .update({ status: "error" })
        .eq("id", conn.id);
    }
  }

  return NextResponse.json({ connections: results.length, results });
}
