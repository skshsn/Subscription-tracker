import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listCandidateMessages } from "@/lib/gmail/client";
import { classifyEmail } from "@/lib/gmail/classifier";
import { extractWithLLMFallback } from "@/lib/gmail/extract";

// Calibrated against a real inbox scan rather than the PRD's untested
// >=60 figure: real recurring-payment emails routed through a third-
// party payment gateway (Razorpay, Cashfree, Stripe -- extremely common
// in practice) never get the sender-domain-match bonus, since the
// sender is the payment processor, not the merchant. Their ceiling is
// keyword + price match (~45), while generic transactional noise
// (rent receipts, utility bills, job-application confirmations, one-
// time purchases) tops out around 25. 40 sits cleanly between the two
// observed clusters -- see keywords.ts for the underlying weights.
const MIN_CONFIDENCE_TO_PERSIST = 40;
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

    // A recurring sender (e.g. a monthly renewal notice) produces a new
    // message -- and thus a new candidate row -- every cycle. Without
    // this, the Candidates page fills up with one card per past email
    // instead of one per distinct subscription. Superseding older
    // pending candidates from the same sender keeps only the most
    // recent (freshest price/date data) as the active card; the
    // superseded ones are marked 'expired', not deleted, so they still
    // block that message_id from ever being re-surfaced.
    await admin
      .from("detected_candidates")
      .update({ status: "expired" })
      .eq("user_id", userId)
      .eq("sender_domain", msg.senderDomain)
      .eq("status", "pending");

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
