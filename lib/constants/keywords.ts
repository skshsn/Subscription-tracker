/**
 * Weighted keyword signals for lib/gmail/classifier.ts, capped at 50 total.
 *
 * Calibrated against a real inbox scan (see git history for the raw
 * numbers): generic transactional words ("receipt", "invoice") match
 * one-off purchases, rent receipts, utility bills, and job-application
 * confirmations just as often as real subscriptions, so they stay weak
 * on their own. Recurring-billing-specific phrases carry most of the
 * weight, since those genuinely don't show up outside subscription
 * contexts.
 */
export const SUBSCRIPTION_KEYWORDS: { phrase: string; weight: number }[] = [
  { phrase: "subscription confirmed", weight: 30 },
  { phrase: "auto-renewal", weight: 30 },
  { phrase: "autorenewal", weight: 30 },
  { phrase: "recurring payment", weight: 30 },
  { phrase: "trial ends", weight: 30 },
  { phrase: "trial ending", weight: 30 },
  { phrase: "your membership", weight: 25 },
  { phrase: "renewal", weight: 25 },
  { phrase: "payment successful", weight: 25 },
  { phrase: "monthly plan", weight: 20 },
  { phrase: "annual plan", weight: 20 },
  // Weak/generic on their own -- real signal only in combination with a
  // price or renewal-date match (see classifier.ts scoring).
  { phrase: "invoice", weight: 5 },
  { phrase: "receipt", weight: 5 },
];
