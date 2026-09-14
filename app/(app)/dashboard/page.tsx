import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { UpcomingCharges } from "@/components/dashboard/UpcomingCharges";
import { SubscriptionTable, type SubscriptionRow } from "@/components/subscriptions/SubscriptionTable";
import { Button } from "@/components/ui/button";
import { summarizeSubscriptions } from "@/lib/dashboard";

export default async function DashboardPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(
      "id, merchant_name, price, currency, billing_frequency, billing_cycle_days, next_billing_date, access_until_date, status, trial_end_date, categories(name)",
    )
    .eq("user_id", user.id)
    .order("next_billing_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  const rows: SubscriptionRow[] = (subscriptions ?? []).map((s) => ({
    id: s.id,
    merchant_name: s.merchant_name,
    category_name: (s.categories as unknown as { name: string } | null)?.name ?? null,
    price: Number(s.price),
    currency: s.currency,
    billing_frequency: s.billing_frequency,
    next_billing_date: s.next_billing_date,
    status: s.status,
    access_until_date: s.access_until_date,
  }));

  const summary = summarizeSubscriptions(
    (subscriptions ?? []).map((s) => ({
      price: Number(s.price),
      currency: s.currency,
      billing_frequency: s.billing_frequency,
      billing_cycle_days: s.billing_cycle_days,
      status: s.status,
      next_billing_date: s.next_billing_date,
      trial_end_date: s.trial_end_date,
    })),
  );

  const today = new Date();
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const upcoming = rows
    .filter((r) => {
      if (!r.next_billing_date) return false;
      const d = new Date(r.next_billing_date);
      return d >= today && d <= sevenDaysOut;
    })
    .map((r) => ({
      id: r.id,
      merchant_name: r.merchant_name,
      price: r.price,
      currency: r.currency,
      next_billing_date: r.next_billing_date as string,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <Link href="/subscriptions/new">
          <Button size="sm">Add subscription</Button>
        </Link>
      </div>

      <SummaryCards summary={summary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <UpcomingCharges items={upcoming} />
        </div>
        <div className="rounded-[var(--radius-lg)] bg-surface p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-medium text-muted">All subscriptions</h3>
          <SubscriptionTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
