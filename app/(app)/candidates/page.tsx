import { createClient, requireUser } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CandidateCard } from "@/components/candidates/CandidateCard";

export default async function CandidatesPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: candidates, error } = await supabase
    .from("detected_candidates")
    .select(
      "id, merchant_guess, price_guess, currency_guess, frequency_guess, next_billing_date_guess, trial_guess, confidence, subject",
    )
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("confidence", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Candidates</h1>
        <p className="text-sm text-muted">
          Subscriptions we spotted in your inbox. Confirm the ones that are
          right, or dismiss what isn&apos;t.
        </p>
      </div>

      {!candidates || candidates.length === 0 ? (
        <Card>
          <p className="text-muted">
            Nothing to review right now. Connect Gmail in Settings to detect
            subscriptions automatically.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
