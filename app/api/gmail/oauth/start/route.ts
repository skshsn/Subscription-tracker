import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/supabase/server";
import { buildConsentUrl } from "@/lib/gmail/oauth";

export async function GET() {
  const { user } = await requireUser();

  // state binds this consent flow to the signed-in user and guards
  // against CSRF; verified against the cookie in the callback route.
  const state = `${user.id}.${randomBytes(16).toString("hex")}`;
  const consentUrl = buildConsentUrl(state);

  const response = NextResponse.redirect(consentUrl);
  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
