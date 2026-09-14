import { notFound } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";

export default async function EditSubscriptionPage(
  props: PageProps<"/subscriptions/[id]/edit">,
) {
  const { id } = await props.params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const [{ data: sub }, { data: categories }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase
      .from("categories")
      .select("id, name")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("name"),
  ]);

  if (!sub) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Edit subscription</h1>
      <SubscriptionForm
        categories={categories ?? []}
        subscriptionId={sub.id}
        defaultValues={{
          merchant_name: sub.merchant_name,
          product_name: sub.product_name ?? "",
          category_id: sub.category_id,
          price: Number(sub.price),
          currency: sub.currency,
          billing_frequency: sub.billing_frequency,
          billing_cycle_days: sub.billing_cycle_days,
          next_billing_date: sub.next_billing_date,
          subscription_start_date: sub.subscription_start_date,
          status: sub.status,
          trial_end_date: sub.trial_end_date,
          payment_method: sub.payment_method ?? "",
          purchase_platform: sub.purchase_platform,
          manage_url: sub.manage_url ?? "",
          cancel_url: sub.cancel_url ?? "",
        }}
      />
    </div>
  );
}
