import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import { SubscriptionTable, type SubscriptionRow } from "@/components/subscriptions/SubscriptionTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function SubscriptionsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, merchant_name, price, currency, billing_frequency, next_billing_date, access_until_date, status, categories(name)",
    )
    .eq("user_id", user.id)
    .order("merchant_name", { ascending: true });

  if (error) throw new Error(error.message);

  const rows: SubscriptionRow[] = (data ?? []).map((s) => ({
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Subscriptions</h1>
        <Link href="/subscriptions/new">
          <Button size="sm">Add subscription</Button>
        </Link>
      </div>
      <Card>
        <SubscriptionTable rows={rows} />
      </Card>
    </div>
  );
}
