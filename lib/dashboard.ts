import { annualizedCost } from "@/lib/currency";
import type { BillingFrequency } from "@/lib/currency";

export interface SubscriptionForSummary {
  price: number;
  currency: string;
  billing_frequency: BillingFrequency;
  billing_cycle_days: number | null;
  status: string;
  next_billing_date: string | null;
  trial_end_date: string | null;
}

export interface CurrencyTotals {
  currency: string;
  monthly: number;
  annual: number;
}

export interface DashboardSummary {
  byCurrency: CurrencyTotals[];
  activeCount: number;
  trialCount: number;
  renewingSoonCount: number;
}

/**
 * Paid (price > 0) active/trial subscriptions only, per PRD §49 (free
 * plans don't count toward recurring spend). Totals are grouped by
 * currency rather than summed together -- adding e.g. USD and INR into
 * one number would misrepresent spend, which this product exists to
 * make trustworthy (PRD principle #2).
 */
export function summarizeSubscriptions(
  subscriptions: SubscriptionForSummary[],
  today: Date = new Date(),
): DashboardSummary {
  const totals = new Map<string, CurrencyTotals>();
  let activeCount = 0;
  let trialCount = 0;
  let renewingSoonCount = 0;

  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  for (const sub of subscriptions) {
    if (sub.status === "active") activeCount++;
    if (sub.status === "trial") trialCount++;

    if (sub.next_billing_date) {
      const next = new Date(sub.next_billing_date);
      if (next >= today && next <= sevenDaysOut) renewingSoonCount++;
    }

    const isSpending = (sub.status === "active" || sub.status === "trial") && sub.price > 0;
    if (!isSpending) continue;

    const annual = annualizedCost(sub.price, sub.billing_frequency, sub.billing_cycle_days);
    const existing = totals.get(sub.currency) ?? {
      currency: sub.currency,
      monthly: 0,
      annual: 0,
    };
    existing.annual += annual;
    existing.monthly += annual / 12;
    totals.set(sub.currency, existing);
  }

  return {
    byCurrency: Array.from(totals.values()).sort((a, b) => b.annual - a.annual),
    activeCount,
    trialCount,
    renewingSoonCount,
  };
}
