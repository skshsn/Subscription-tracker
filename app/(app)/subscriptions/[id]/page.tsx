import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/subscriptions/StatusBadge";
import { DetailActions } from "@/components/subscriptions/DetailActions";
import { annualizedCost, formatMoney, FREQUENCY_LABEL } from "@/lib/currency";

export default async function SubscriptionDetailPage(
  props: PageProps<"/subscriptions/[id]">,
) {
  const { id } = await props.params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, categories(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!sub) notFound();

  const annual = annualizedCost(
    Number(sub.price),
    sub.billing_frequency,
    sub.billing_cycle_days,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {sub.merchant_name}
          </h1>
          <p className="text-muted">
            {formatMoney(Number(sub.price), sub.currency)} /{" "}
            {FREQUENCY_LABEL[sub.billing_frequency as keyof typeof FREQUENCY_LABEL].toLowerCase()}
          </p>
        </div>
        <StatusBadge status={sub.status} accessUntilDate={sub.access_until_date} />
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-y-4 text-sm">
          <div>
            <dt className="text-muted">Next payment</dt>
            <dd className="mt-1 font-medium">
              {sub.next_billing_date
                ? new Date(sub.next_billing_date).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Renewal date unavailable"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Estimated annual cost</dt>
            <dd className="mt-1 font-medium">
              {formatMoney(annual, sub.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Started</dt>
            <dd className="mt-1 font-medium">
              {sub.subscription_start_date
                ? new Date(sub.subscription_start_date).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Payment method</dt>
            <dd className="mt-1 font-medium">{sub.payment_method || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Category</dt>
            <dd className="mt-1 font-medium">
              {(sub.categories as unknown as { name: string } | null)?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Detected via</dt>
            <dd className="mt-1 font-medium capitalize">{sub.detection_source}</dd>
          </div>
        </dl>
      </Card>

      <DetailActions
        subscriptionId={sub.id}
        manageUrl={sub.manage_url}
        cancelUrl={sub.cancel_url}
        cancellationInstructions={sub.cancellation_instructions}
        purchasePlatform={sub.purchase_platform}
        status={sub.status}
      />

      <Link href={`/subscriptions/${sub.id}/edit`}>
        <Button variant="secondary" className="w-full">
          Edit subscription
        </Button>
      </Link>
    </div>
  );
}
