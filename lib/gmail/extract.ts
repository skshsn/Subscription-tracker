import * as chrono from "chrono-node";
import type { BillingFrequency } from "@/lib/currency";

const PRICE_PATTERN = /([$₹€£]|USD|INR|EUR|GBP)\s?(\d[\d,]*\.?\d{0,2})/i;

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  "$": "USD",
  "₹": "INR",
  "€": "EUR",
  "£": "GBP",
};

const FREQUENCY_PATTERNS: [RegExp, BillingFrequency][] = [
  [/\b(annual|yearly|\/yr|per year)\b/i, "annual"],
  [/\b(half.yearly|semi.annual)\b/i, "half_yearly"],
  [/\b(quarterly|every 3 months)\b/i, "quarterly"],
  [/\b(weekly|\/wk|per week)\b/i, "weekly"],
  [/\b(monthly|\/mo\b|per month)\b/i, "monthly"],
];

export interface ExtractedFields {
  merchantGuess: string | null;
  priceGuess: number | null;
  currencyGuess: string | null;
  frequencyGuess: BillingFrequency | null;
  nextBillingDateGuess: string | null;
  isTrial: boolean;
}

/**
 * Regex + chrono-node baseline extraction -- deliberately not an LLM
 * call, so this always works with zero external dependencies/cost.
 * extractWithLLMFallback() below is the optional enhancement.
 */
export function extractFields(
  subject: string,
  snippet: string,
  senderDisplayName: string,
): ExtractedFields {
  const text = `${subject} ${snippet}`;

  const priceMatch = text.match(PRICE_PATTERN);
  const priceGuess = priceMatch ? Number(priceMatch[2].replace(/,/g, "")) : null;
  const currencyGuess = priceMatch
    ? (CURRENCY_SYMBOL_MAP[priceMatch[1]] ?? priceMatch[1].toUpperCase())
    : null;

  let frequencyGuess: BillingFrequency | null = null;
  for (const [pattern, freq] of FREQUENCY_PATTERNS) {
    if (pattern.test(text)) {
      frequencyGuess = freq;
      break;
    }
  }

  const parsedDate = chrono.parseDate(text, new Date(), { forwardDate: true });

  const isTrial = /\btrial\b/i.test(text);

  return {
    merchantGuess: senderDisplayName || null,
    priceGuess,
    currencyGuess,
    frequencyGuess,
    nextBillingDateGuess: parsedDate ? parsedDate.toISOString().slice(0, 10) : null,
    isTrial,
  };
}

/**
 * Optional enhancement: if ANTHROPIC_API_KEY is set, ask a small/fast
 * Claude model for stricter structured extraction. Always falls back to
 * the regex/chrono path on any error or missing key -- the app must
 * fully function without this.
 */
export async function extractWithLLMFallback(
  subject: string,
  snippet: string,
  senderDisplayName: string,
): Promise<ExtractedFields> {
  const fallback = extractFields(subject, snippet, senderDisplayName);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Extract subscription billing details from this email as strict JSON with keys merchant, price (number or null), currency (ISO code or null), frequency (one of weekly/monthly/quarterly/half_yearly/annual/custom or null), next_billing_date (YYYY-MM-DD or null), is_trial (boolean). Reply with ONLY the JSON object, no prose.\n\nFrom: ${senderDisplayName}\nSubject: ${subject}\nBody: ${snippet}`,
          },
        ],
      }),
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    const textBlock = data?.content?.[0]?.text;
    if (!textBlock) return fallback;

    const parsed = JSON.parse(textBlock);
    return {
      merchantGuess: parsed.merchant ?? fallback.merchantGuess,
      priceGuess: typeof parsed.price === "number" ? parsed.price : fallback.priceGuess,
      currencyGuess: parsed.currency ?? fallback.currencyGuess,
      frequencyGuess: parsed.frequency ?? fallback.frequencyGuess,
      nextBillingDateGuess: parsed.next_billing_date ?? fallback.nextBillingDateGuess,
      isTrial: typeof parsed.is_trial === "boolean" ? parsed.is_trial : fallback.isTrial,
    };
  } catch {
    return fallback;
  }
}
