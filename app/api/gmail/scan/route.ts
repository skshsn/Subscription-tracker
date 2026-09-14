import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runScanForConnection } from "@/lib/gmail/scan";

export async function POST() {
  const { user } = await requireUser();

  // gmail_connections has no RLS policy for the authenticated role at
  // all (default-deny by design) -- only the service-role client can
  // read it, even to check the current user's own connection.
  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("gmail_connections")
    .select("id, status")
    .eq("user_id", user.id)
    .single();

  if (error || !connection) {
    return NextResponse.json({ error: "Gmail is not connected" }, { status: 400 });
  }

  if (connection.status !== "connected") {
    return NextResponse.json({ error: "Gmail connection is not active" }, { status: 400 });
  }

  try {
    const result = await runScanForConnection(connection.id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 },
    );
  }
}
