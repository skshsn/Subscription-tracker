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
// Kept conservative (2 pages = 100 messages) to stay within the hosting
// platform's serverless function time limit.
const MAX_PAGES = 2;

// Fetching metadata for every message at once (one Promise.all over the
// whole page) blew past Gmail's per-user rate limit and/or the function's
// time budget, and a single failed request aborted the entire batch --
// surfacing as a raw platform error page instead of a JSON response.
// Bounded concurrency plus per-item error handling fixes both.
const METADATA_FETCH_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

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

  // Fetch metadata with bounded concurrency rather than one-by-one (too
  // slow) or all-at-once (blows past Gmail's rate limit and/or the
  // function's time budget). A message that fails to fetch is skipped,
  // not fatal to the whole scan -- it'll be picked up on a later scan
  // since it was never inserted into detected_candidates.
  const summaries = await mapWithConcurrency(
    messageIds,
    METADATA_FETCH_CONCURRENCY,
    async (id): Promise<GmailMessageSummary | null> => {
      try {
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
      } catch {
        return null;
      }
    },
  );

  return {
    summaries: summaries.filter((s): s is GmailMessageSummary => s !== null),
    hasMore,
  };
}
