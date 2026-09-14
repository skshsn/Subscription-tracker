import { z } from "zod";

export const BILLING_FREQUENCIES = [
  "weekly",
  "monthly",
  "quarterly",
  "half_yearly",
  "annual",
  "custom",
] as const;

export const SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "paused",
  "cancelled",
  "expired",
  "unknown",
] as const;

export const PURCHASE_PLATFORMS = [
  "website",
  "apple",
  "google_play",
  "upi",
  "paypal",
  "credit_card",
  "telecom",
  "other",
] as const;

export const subscriptionFormSchema = z
  .object({
    merchant_name: z.string().trim().min(1, "Required").max(200),
    product_name: z.string().trim().max(200).optional().or(z.literal("")),
    provider_id: z.string().uuid().optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),

    price: z.coerce.number().min(0, "Must be zero or more"),
    currency: z
      .string()
      .trim()
      .length(3, "3-letter ISO code, e.g. USD")
      .transform((v) => v.toUpperCase()),
    billing_frequency: z.enum(BILLING_FREQUENCIES),
    billing_cycle_days: z.coerce.number().int().positive().optional().nullable(),

    next_billing_date: z.string().optional().nullable(),
    subscription_start_date: z.string().optional().nullable(),

    is_trial: z.coerce.boolean().optional(),
    trial_end_date: z.string().optional().nullable(),

    payment_method: z.string().trim().max(200).optional().or(z.literal("")),
    purchase_platform: z.enum(PURCHASE_PLATFORMS).default("other"),

    status: z.enum(SUBSCRIPTION_STATUSES).default("active"),

    manage_url: z.string().url().optional().or(z.literal("")),
    cancel_url: z.string().url().optional().or(z.literal("")),
  })
  .refine(
    (data) => data.billing_frequency !== "custom" || !!data.billing_cycle_days,
    {
      message: "Billing cycle length (days) is required for custom frequency",
      path: ["billing_cycle_days"],
    },
  );

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;
