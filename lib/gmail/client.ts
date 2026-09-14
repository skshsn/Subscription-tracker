import "server-only";
import { google } from "googleapis";
import { createGmailOAuthClient } from "@/lib/gmail/oauth";
import { encryptToken, decryptToken } from "@/lib/gmail/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Narrow query so a scan doesn't have to page through an entire mailbox --
// important given Vercel function time limits. Widened `newer_than` window
// is fine since detected_candidates dedupes on message_id.
const SEARCH_QUERY =
  '(subject:(subscription OR receipt OR invoice OR renewal OR membership) OR "payment successful" OR "auto-renewal" OR "recurring payment" OR "trial ends") newer_than:365d';

const MAX_MESSAGES_PER_SCAN = 50;

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  senderDomain: string;
  subject: string;
  snippet: string;
}

async function getAuthedClientForConnection(connectionId: string) {
  const admin = createAdminClient();
  const { data: conn, error } = await admin
    .from("gmail_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (error || !conn) throw new Error("Gmail connection not found");

  const oauth2Client = createGmailOAuthClient();
  oauth2Client.setCredentials({
    access_token: decryptToken(conn.access_token_enc),
    refresh_token: decryptToken(conn.refresh_token_enc),
    expiry_date: new Date(conn.token_expiry).getTime(),
  });

  // Proactively refresh if expired; google-auth-library also does this
  // automatically on demand, but refreshing here lets us persist the new
  // access token immediately rather than losing it at process exit.
  if (new Date(conn.token_expiry).getTime() <= Date.now()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.access_token) {
      await admin
        .from("gmail_connections")
        .update({
          access_token_enc: encryptToken(credentials.access_token),
          token_expiry: new Date(credentials.expiry_date ?? Date.now() + 3600_000).toISOString(),
        })
        .eq("id", connectionId);
      oauth2Client.setCredentials(credentials);
    }
  }

  return oauth2Client;
}

function extractHeader(headers: { name?: string | null; value?: string | null }[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractDomain(fromHeader: string): string {
  const match = fromHeader.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : "";
}

export async function listCandidateMessages(
  connectionId: string,
  after?: string,
): Promise<GmailMessageSummary[]> {
  const auth = await getAuthedClientForConnection(connectionId);
  const gmail = google.gmail({ version: "v1", auth });

  const q = after ? `${SEARCH_QUERY} after:${after}` : SEARCH_QUERY;

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q,
    maxResults: MAX_MESSAGES_PER_SCAN,
  });

  const messages = listRes.data.messages ?? [];
  const summaries: GmailMessageSummary[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From"],
    });

    const headers = full.data.payload?.headers ?? [];
    const from = extractHeader(headers, "From");

    summaries.push({
      id: msg.id,
      threadId: full.data.threadId ?? "",
      senderDomain: extractDomain(from),
      subject: extractHeader(headers, "Subject"),
      snippet: full.data.snippet ?? "",
    });
  }

  return summaries;
}
