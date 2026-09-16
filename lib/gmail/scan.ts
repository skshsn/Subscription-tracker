import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listCandidateMessages } from "@/lib/gmail/client";
import { classifyEmail } from "@/lib/gmail/classifier";
import { extractWithLLMFallback } from "@/lib/gmail/extract";

// TEMP: lowered from 60 to 0 to diagnose why real-world scans were
// finding zero candidates -- lets us inspect actual confidence scores
// in detected_candidates for real emails instead of guessing at the
// classifier's calibration blind. Restore to 60 once recalibrated.
const MIN_CONFIDENCE_TO_PERSIST = 0;
const UNIQUE_VIOLATION = "23505";

function domainMatches(domain: string, known: string) {
  return domain === known || domain.endsWith(`.${known}`);
}

function formatAfterDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export async function runScanForConnection(connectionId: string, userId: string) {
  const admin = createAdminClient();

  const { data: connection } = await admin
    .from("gmail_connections")
    .select("last_scanned_at")
    .eq("id", connectionId)
    .single();

  const after = connection?.last_scanned_at
    ? formatAfterDate(connection.last_scanned_at)
    : undefined;

  const { summaries: messages, hasMore } = await listCandidateMessages(connectionId, after);

  const { data: providers } = await admin
    .from("providers")
    .select("id, domains");

  const allDomains = (providers ?? []).flatMap((p) => p.domains as string[]);

  let created = 0;
  let discarded = 0;

  for (const msg of messages) {
    const matchedProvider = (providers ?? []).find((p) =>
      (p.domains as string[]).some((d) => domainMatches(msg.senderDomain, d)),
    );

    const classification = classifyEmail({
      subject: msg.subject,
      snippet: msg.snippet,
      senderDomain: msg.senderDomain,
      knownProviderDomains: allDomains,
    });

    if (classification.confidence < MIN_CONFIDENCE_TO_PERSIST) {
      discarded++;
      continue;
    }

    const extracted = await extractWithLLMFallback(
      msg.subject,
      msg.snippet,
      msg.senderDomain,
    );

    let matchedSubscriptionId: string | null = null;
    if (matchedProvider) {
      const { data: existingSub } = await admin
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("provider_id", matchedProvider.id)
        .maybeSingle();
      matchedSubscriptionId = existingSub?.id ?? null;
    }

    const { error } = await admin.from("detected_candidates").insert({
      user_id: userId,
      gmail_connection_id: connectionId,
      message_id: msg.id,
      thread_id: msg.threadId,
      sender_domain: msg.senderDomain,
      subject: msg.subject,
      snippet: msg.snippet,
      merchant_guess: extracted.merchantGuess,
      provider_id: matchedProvider?.id ?? null,
      price_guess: extracted.priceGuess,
      currency_guess: extracted.currencyGuess,
      frequency_guess: extracted.frequencyGuess,
      next_billing_date_guess: extracted.nextBillingDateGuess,
      trial_guess: extracted.isTrial,
      confidence: classification.confidence,
      matched_keywords: classification.matchedKeywords,
      raw_extract: extracted,
      matched_existing_subscription_id: matchedSubscriptionId,
    });

    // unique(user_id, message_id) -- a message already scanned in a
    // previous run is expected, not an error.
    if (error && error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
    if (!error) created++;
  }

  // Only advance the cursor once this run has actually caught up to "now" --
  // if hasMore is true, the mailbox has more matching messages than this
  // invocation processed, and jumping the cursor forward anyway would
  // permanently skip the untouched remainder rather than pick it up on
  // the next scan.
  if (!hasMore) {
    await admin
      .from("gmail_connections")
      .update({ last_scanned_at: new Date().toISOString() })
      .eq("id", connectionId);
  }

  return { scanned: messages.length, created, discarded, hasMore };
}
