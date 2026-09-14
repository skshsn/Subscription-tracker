export type BillingFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "annual"
  | "custom";

/**
 * Annualized cost per PRD §23 -- lets subscriptions on different billing
 * cycles be compared apples-to-apples. `billingCycleDays` is required
 * only for 'custom' frequency.
 */
export function annualizedCost(
  price: number,
  frequency: BillingFrequency,
  billingCycleDays?: number | null,
): number {
  switch (frequency) {
    case "weekly":
      return price * 52;
    case "monthly":
      return price * 12;
    case "quarterly":
      return price * 4;
    case "half_yearly":
      return price * 2;
    case "annual":
      return price;
    case "custom":
      if (!billingCycleDays || billingCycleDays <= 0) return 0;
      return price * (365 / billingCycleDays);
  }
}

export function monthlyEquivalent(
  price: number,
  frequency: BillingFrequency,
  billingCycleDays?: number | null,
): number {
  return annualizedCost(price, frequency, billingCycleDays) / 12;
}

const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

export function formatMoney(amount: number, currency: string): string {
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const FREQUENCY_LABEL: Record<BillingFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  annual: "Annual",
  custom: "Custom",
};
