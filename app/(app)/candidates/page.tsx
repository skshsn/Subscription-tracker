import { createClient, requireUser } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CandidateCard, type Candidate } from "@/components/candidates/CandidateCard";

// Mirrors the PRD's own detection-confidence bands (§19): >=90 would be
// auto-suggested (still one-click confirm, never silent), 60-89 needs an
// explicit look. Since the real persist floor is 40 (see scan.ts for why
// 60 turned out unreachable for genuine payment-gateway-routed emails),
// the practical split here is "likely" vs "needs a closer look".
function groupByConfidence(candidates: Candidate[]) {
  return {
    likely: candidates.filter((c) => c.confidence >= 65),
    needsReview: candidates.filter((c) => c.confidence < 65),
  };
}

export default async function CandidatesPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: candidates, error } = await supabase
    .from("detected_candidates")
    .select(
      "id, merchant_guess, price_guess, currency_guess, frequency_guess, next_billing_date_guess, trial_guess, confidence, subject, providers(name, default_category_id, categories:default_category_id(name))",
    )
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("confidence", { ascending: false });

  if (error) throw new Error(error.message);

  const rows: Candidate[] = (candidates ?? []).map((c) => ({
    id: c.id,
    merchant_guess: c.merchant_guess,
    price_guess: c.price_guess,
    currency_guess: c.currency_guess,
    frequency_guess: c.frequency_guess,
    next_billing_date_guess: c.next_billing_date_guess,
    trial_guess: c.trial_guess,
    confidence: Number(c.confidence),
    subject: c.subject,
    category_name:
      (c.providers as unknown as { categories: { name: string } | null } | null)?.categories
        ?.name ?? null,
  }));

  const { likely, needsReview } = groupByConfidence(rows);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Candidates</h1>
        <p className="text-sm text-muted">
          Subscriptions we spotted in your inbox. Confirm the ones that are
          right, or dismiss what isn&apos;t.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-muted">
            Nothing to review right now. Connect Gmail in Settings to detect
            subscriptions automatically.
          </p>
        </Card>
      ) : (
        <>
          {likely.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted">
                Likely subscriptions ({likely.length})
              </h2>
              {likely.map((c) => (
                <CandidateCard key={c.id} candidate={c} />
              ))}
            </div>
          )}
          {needsReview.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted">
                Needs a closer look ({needsReview.length})
              </h2>
              {needsReview.map((c) => (
                <CandidateCard key={c.id} candidate={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
