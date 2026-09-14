import { SUBSCRIPTION_KEYWORDS } from "@/lib/constants/keywords";

const PRICE_PATTERN = /(?:[$₹€£]|USD|INR|EUR|GBP)\s?\d[\d,]*\.?\d{0,2}/i;
const RENEWAL_DATE_PATTERN = /(renews on|next billing date|next payment|billing date)/i;

export interface ClassificationInput {
  subject: string;
  snippet: string;
  senderDomain: string;
  knownProviderDomains: string[];
}

export interface ClassificationResult {
  confidence: number;
  matchedKeywords: string[];
  domainMatched: boolean;
}

/**
 * Deterministic 0-100 confidence score (PRD §19 bands: >=90 auto-suggest,
 * 60-89 ask, <60 discard -- discard means "never persisted", not
 * "stored but hidden", per the build plan's explicit interpretation of
 * an otherwise ambiguous PRD line). Intentionally not ML-based for MVP;
 * lib/gmail/extract.ts documents where an LLM call can later replace
 * the regex-based entity extraction without touching this scoring.
 */
export function classifyEmail(input: ClassificationInput): ClassificationResult {
  const text = `${input.subject} ${input.snippet}`.toLowerCase();

  const matchedKeywords = SUBSCRIPTION_KEYWORDS.filter((k) =>
    text.includes(k.phrase),
  ).map((k) => k.phrase);

  const keywordScore = Math.min(
    50,
    SUBSCRIPTION_KEYWORDS.filter((k) => matchedKeywords.includes(k.phrase)).reduce(
      (sum, k) => sum + k.weight,
      0,
    ),
  );

  const priceScore = PRICE_PATTERN.test(text) ? 20 : 0;
  const dateScore = RENEWAL_DATE_PATTERN.test(text) ? 15 : 0;

  const domainMatched = input.knownProviderDomains.some((d) =>
    input.senderDomain === d || input.senderDomain.endsWith(`.${d}`),
  );
  const domainScore = domainMatched ? 15 : 0;

  const confidence = Math.min(100, keywordScore + priceScore + dateScore + domainScore);

  return { confidence, matchedKeywords, domainMatched };
}
