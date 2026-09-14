import { createClient, requireUser } from "@/lib/supabase/server";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";

export default async function NewSubscriptionPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("name");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Add subscription</h1>
      <SubscriptionForm categories={categories ?? []} />
    </div>
  );
}
