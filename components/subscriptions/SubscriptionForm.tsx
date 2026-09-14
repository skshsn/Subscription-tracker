"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  BILLING_FREQUENCIES,
  PURCHASE_PLATFORMS,
  type SubscriptionFormValues,
} from "@/lib/validations/subscription";

type Frequency = SubscriptionFormValues["billing_frequency"];
import { FREQUENCY_LABEL } from "@/lib/currency";
import { createSubscription, updateSubscription } from "@/actions/subscriptions";
import { searchProviders } from "@/actions/providers";

type ProviderMatch = {
  id: string;
  name: string;
  category_id: string | null;
  manage_url: string | null;
  cancel_url: string | null;
  cancellation_instructions: string | null;
};

type Category = { id: string; name: string };

const PLATFORM_LABEL: Record<string, string> = {
  website: "Website",
  apple: "Apple",
  google_play: "Google Play",
  upi: "UPI",
  paypal: "PayPal",
  credit_card: "Credit card",
  telecom: "Telecom",
  other: "Other",
};

export function SubscriptionForm({
  categories,
  subscriptionId,
  defaultValues,
}: {
  categories: Category[];
  subscriptionId?: string;
  defaultValues?: Partial<SubscriptionFormValues>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(defaultValues?.status === "trial");
  const [frequency, setFrequency] = useState<Frequency>(
    defaultValues?.billing_frequency ?? "monthly",
  );

  const [merchantName, setMerchantName] = useState(defaultValues?.merchant_name ?? "");
  const [providerId, setProviderId] = useState<string | null>(
    defaultValues?.provider_id ?? null,
  );
  const [categoryId, setCategoryId] = useState(defaultValues?.category_id ?? "");
  const [manageUrl, setManageUrl] = useState(defaultValues?.manage_url ?? "");
  const [cancelUrl, setCancelUrl] = useState(defaultValues?.cancel_url ?? "");
  const [matches, setMatches] = useState<ProviderMatch[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMerchantNameChange(value: string) {
    setMerchantName(value);
    setProviderId(null);
    setShowMatches(true);

    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 1) {
      setMatches([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const results = await searchProviders(value);
      setMatches(results as ProviderMatch[]);
    }, 250);
  }

  function selectProvider(provider: ProviderMatch) {
    setMerchantName(provider.name);
    setProviderId(provider.id);
    if (provider.category_id) setCategoryId(provider.category_id);
    if (provider.manage_url) setManageUrl(provider.manage_url);
    if (provider.cancel_url) setCancelUrl(provider.cancel_url);
    setMatches([]);
    setShowMatches(false);
  }

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const values: SubscriptionFormValues = {
      merchant_name: merchantName,
      product_name: String(formData.get("product_name") ?? ""),
      provider_id: providerId,
      category_id: categoryId || null,
      price: Number(formData.get("price") ?? 0),
      currency: String(formData.get("currency") ?? "USD"),
      billing_frequency: frequency as SubscriptionFormValues["billing_frequency"],
      billing_cycle_days: formData.get("billing_cycle_days")
        ? Number(formData.get("billing_cycle_days"))
        : null,
      next_billing_date: (formData.get("next_billing_date") as string) || null,
      subscription_start_date:
        (formData.get("subscription_start_date") as string) || null,
      is_trial: isTrial,
      trial_end_date: (formData.get("trial_end_date") as string) || null,
      payment_method: String(formData.get("payment_method") ?? ""),
      purchase_platform: formData.get(
        "purchase_platform",
      ) as SubscriptionFormValues["purchase_platform"],
      status: isTrial ? "trial" : "active",
      manage_url: manageUrl,
      cancel_url: cancelUrl,
    };

    try {
      if (subscriptionId) {
        await updateSubscription(subscriptionId, values);
        router.push(`/subscriptions/${subscriptionId}`);
      } else {
        const id = await createSubscription(values);
        router.push(`/subscriptions/${id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card>
      <form action={handleSubmit} className="space-y-5">
        <div className="relative">
          <Label htmlFor="merchant_name">Subscription name</Label>
          <Input
            id="merchant_name"
            name="merchant_name"
            required
            autoComplete="off"
            value={merchantName}
            onChange={(e) => handleMerchantNameChange(e.target.value)}
            onFocus={() => setShowMatches(true)}
            onBlur={() => setTimeout(() => setShowMatches(false), 150)}
            placeholder="Netflix, local gym, …"
          />
          {showMatches && matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-[var(--radius-sm)] border border-border-subtle bg-surface-raised shadow-lg">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectProvider(m)}
                  >
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {providerId && (
            <p className="mt-1 text-xs text-accent">
              Matched provider — cancellation details autofilled below.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={defaultValues?.price}
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              name="currency"
              maxLength={3}
              required
              defaultValue={defaultValues?.currency ?? "USD"}
              placeholder="USD"
              className="uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="billing_frequency">Billing frequency</Label>
            <select
              id="billing_frequency"
              name="billing_frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-accent/60"
            >
              {BILLING_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
          {frequency === "custom" && (
            <div>
              <Label htmlFor="billing_cycle_days">Cycle length (days)</Label>
              <Input
                id="billing_cycle_days"
                name="billing_cycle_days"
                type="number"
                min="1"
                required
                defaultValue={defaultValues?.billing_cycle_days ?? undefined}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="next_billing_date">Next billing date</Label>
            <Input
              id="next_billing_date"
              name="next_billing_date"
              type="date"
              defaultValue={defaultValues?.next_billing_date ?? undefined}
            />
          </div>
          <div>
            <Label htmlFor="subscription_start_date">Start date</Label>
            <Input
              id="subscription_start_date"
              name="subscription_start_date"
              type="date"
              defaultValue={defaultValues?.subscription_start_date ?? undefined}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_trial"
            type="checkbox"
            checked={isTrial}
            onChange={(e) => setIsTrial(e.target.checked)}
            className="h-4 w-4 rounded border-border-subtle accent-[var(--accent)]"
          />
          <Label htmlFor="is_trial" className="mb-0 cursor-pointer">
            This is a free trial
          </Label>
        </div>

        {isTrial && (
          <div>
            <Label htmlFor="trial_end_date">Trial ends</Label>
            <Input
              id="trial_end_date"
              name="trial_end_date"
              type="date"
              defaultValue={defaultValues?.trial_end_date ?? undefined}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category_id">Category</Label>
            <select
              id="category_id"
              name="category_id"
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-accent/60"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="purchase_platform">Purchase platform</Label>
            <select
              id="purchase_platform"
              name="purchase_platform"
              defaultValue={defaultValues?.purchase_platform ?? "other"}
              className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-raised px-3 text-sm outline-none focus:border-accent/60"
            >
              {PURCHASE_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="payment_method">Payment method</Label>
          <Input
            id="payment_method"
            name="payment_method"
            defaultValue={defaultValues?.payment_method}
            placeholder="Visa •••• 4234"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="manage_url">Manage URL</Label>
            <Input
              id="manage_url"
              name="manage_url"
              type="url"
              value={manageUrl}
              onChange={(e) => setManageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <Label htmlFor="cancel_url">Cancel URL</Label>
            <Input
              id="cancel_url"
              name="cancel_url"
              type="url"
              value={cancelUrl}
              onChange={(e) => setCancelUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving…" : subscriptionId ? "Save changes" : "Add subscription"}
        </Button>
      </form>
    </Card>
  );
}
