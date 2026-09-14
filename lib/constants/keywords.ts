/** Weighted keyword signals for lib/gmail/classifier.ts, capped at 50 total. */
export const SUBSCRIPTION_KEYWORDS: { phrase: string; weight: number }[] = [
  { phrase: "subscription confirmed", weight: 25 },
  { phrase: "auto-renewal", weight: 25 },
  { phrase: "autorenewal", weight: 25 },
  { phrase: "recurring payment", weight: 25 },
  { phrase: "trial ends", weight: 25 },
  { phrase: "trial ending", weight: 25 },
  { phrase: "your membership", weight: 20 },
  { phrase: "renewal", weight: 20 },
  { phrase: "payment successful", weight: 15 },
  { phrase: "monthly plan", weight: 15 },
  { phrase: "annual plan", weight: 15 },
  { phrase: "invoice", weight: 10 },
  { phrase: "receipt", weight: 8 },
];
