import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGmailOAuthClient } from "@/lib/gmail/oauth";
import { encryptToken } from "@/lib/gmail/crypto";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("gmail_oauth_state="))
    ?.split("=")[1];

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${origin}/settings?gmail_error=invalid_state`);
  }

  const { user } = await requireUser();
  if (!state.startsWith(user.id)) {
    return NextResponse.redirect(`${origin}/settings?gmail_error=user_mismatch`);
  }

  try {
    const oauth2Client = createGmailOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Google did not return a refresh token (consent screen may need re-prompting)");
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    const admin = createAdminClient();
    const { error } = await admin.from("gmail_connections").upsert(
      {
        user_id: user.id,
        gmail_address: profile.email ?? "unknown",
        access_token_enc: encryptToken(tokens.access_token),
        refresh_token_enc: encryptToken(tokens.refresh_token),
        token_expiry: new Date(tokens.expiry_date ?? Date.now() + 3600_000).toISOString(),
        status: "connected",
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error(error.message);

    const response = NextResponse.redirect(`${origin}/settings?gmail_connected=1`);
    response.cookies.delete("gmail_oauth_state");
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      `${origin}/settings?gmail_error=${encodeURIComponent(message)}`,
    );
  }
}
