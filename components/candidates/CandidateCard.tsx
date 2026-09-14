"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, FREQUENCY_LABEL, type BillingFrequency } from "@/lib/currency";
import { confirmCandidate, rejectCandidate } from "@/actions/candidates";

export interface Candidate {
  id: string;
  merchant_guess: string | null;
  price_guess: number | null;
  currency_guess: string | null;
  frequency_guess: BillingFrequency | null;
  next_billing_date_guess: string | null;
  trial_guess: boolean;
  confidence: number;
  subject: string | null;
}

function confidenceVariant(confidence: number) {
  if (confidence >= 90) return "success" as const;
  if (confidence >= 60) return "warning" as const;
  return "neutral" as const;
}

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    await confirmCandidate(candidate.id);
    router.refresh();
  }

  async function handleReject() {
    setPending(true);
    await rejectCandidate(candidate.id);
    router.refresh();
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{candidate.merchant_guess ?? "Unknown sender"}</p>
            <Badge variant={confidenceVariant(candidate.confidence)}>
              {candidate.confidence}% confidence
            </Badge>
            {candidate.trial_guess && <Badge variant="accent">Trial</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {candidate.price_guess != null && candidate.currency_guess
              ? formatMoney(candidate.price_guess, candidate.currency_guess)
              : "Amount unknown"}
            {candidate.frequency_guess && ` · ${FREQUENCY_LABEL[candidate.frequency_guess]}`}
            {candidate.next_billing_date_guess &&
              ` · next ${new Date(candidate.next_billing_date_guess).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          </p>
          {candidate.subject && (
            <p className="mt-1 text-xs text-muted-2">&ldquo;{candidate.subject}&rdquo;</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" disabled={pending} onClick={handleReject}>
            Not a subscription
          </Button>
          <Button size="sm" disabled={pending} onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </Card>
  );
}
