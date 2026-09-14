import "server-only";
import { OAuth2Client } from "google-auth-library";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/**
 * A fully separate OAuth client from whatever Google provider Supabase
 * Auth uses for sign-in. gmail.readonly is a sensitive scope requiring
 * Google app verification -- bundling it into the sign-in flow would
 * force that verification burden onto every new user, so it's a
 * deliberate, user-initiated "Connect email" step instead (see Settings).
 */
export function createGmailOAuthClient() {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_GMAIL_CLIENT_ID,
    clientSecret: process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_GMAIL_REDIRECT_URI,
  });
}

export function buildConsentUrl(state: string) {
  const client = createGmailOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token on every consent, not just the first
    scope: [GMAIL_READONLY_SCOPE, "openid", "email"],
    state,
  });
}
