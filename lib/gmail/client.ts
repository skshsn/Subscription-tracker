import "server-only";
import { google } from "googleapis";
import { createGmailOAuthClient } from "@/lib/gmail/oauth";
import { encryptToken, decryptToken } from "@/lib/gmail/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Narrow query so a scan doesn't have to page through an entire mailbox --
// important given serverless function time limits. Widened `newer_than`
// window is fine since detected_candidates dedupes on message_id.
const SEARCH_QUERY =
  '(subject:(subscription OR receipt OR invoice OR renewal OR membership) OR "payment successful" OR "auto-renewal" OR "recurring payment" OR "trial ends") newer_than:365d';

const PAGE_SIZE = 50;
// Bounds one invocation's total work (up to MAX_PAGES * PAGE_SIZE messages).
// If the mailbox has more matches than this, the scan reports hasMore=true
// and the caller must NOT advance its "last scanned" cursor -- otherwise
// the untouched remainder silently falls behind the cursor and is never
// seen again (the bug this replaces: a single 50-message page followed by
// jumping the cursor to "now" regardless of whether anything was missed).
const MAX_PAGES = 4;

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  senderDomain: string;
  subject: string;
  snippet: string;
}

export interface ListMessagesResult {
  summaries: GmailMessageSummary[];
  hasMore: boolean;
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
): Promise<ListMessagesResult> {
  const auth = await getAuthedClientForConnection(connectionId);
  const gmail = google.gmail({ version: "v1", auth });

  const q = after ? `${SEARCH_QUERY} after:${after}` : SEARCH_QUERY;

  const messageIds: string[] = [];
  let pageToken: string | undefined;
  let hasMore = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q,
      maxResults: PAGE_SIZE,
      pageToken,
    });

    for (const msg of listRes.data.messages ?? []) {
      if (msg.id) messageIds.push(msg.id);
    }

    pageToken = listRes.data.nextPageToken ?? undefined;
    if (!pageToken) break;
    if (page === MAX_PAGES - 1) hasMore = true;
  }

  // Fetch metadata concurrently rather than one-by-one -- with up to
  // MAX_PAGES * PAGE_SIZE messages, a sequential loop risks the
  // function's execution time limit.
  const summaries = await Promise.all(
    messageIds.map(async (id): Promise<GmailMessageSummary | null> => {
      const full = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["Subject", "From"],
      });

      const headers = full.data.payload?.headers ?? [];
      const from = extractHeader(headers, "From");

      return {
        id,
        threadId: full.data.threadId ?? "",
        senderDomain: extractDomain(from),
        subject: extractHeader(headers, "Subject"),
        snippet: full.data.snippet ?? "",
      };
    }),
  );

  return {
    summaries: summaries.filter((s): s is GmailMessageSummary => s !== null),
    hasMore,
  };
}
