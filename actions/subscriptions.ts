"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import {
  subscriptionFormSchema,
  type SubscriptionFormValues,
} from "@/lib/validations/subscription";

function toRow(values: SubscriptionFormValues) {
  return {
    merchant_name: values.merchant_name,
    product_name: values.product_name || null,
    provider_id: values.provider_id || null,
    category_id: values.category_id || null,
    price: values.price,
    currency: values.currency,
    billing_frequency: values.billing_frequency,
    billing_cycle_days:
      values.billing_frequency === "custom" ? values.billing_cycle_days : null,
    next_billing_date: values.next_billing_date || null,
    subscription_start_date: values.subscription_start_date || null,
    status: values.is_trial ? ("trial" as const) : values.status,
    trial_end_date: values.is_trial ? values.trial_end_date || null : null,
    payment_method: values.payment_method || null,
    purchase_platform: values.purchase_platform,
    manage_url: values.manage_url || null,
    cancel_url: values.cancel_url || null,
  };
}

export async function createSubscription(input: SubscriptionFormValues) {
  const { supabase, user } = await requireUser();
  const values = subscriptionFormSchema.parse(input);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      ...toRow(values),
      user_id: user.id,
      detection_source: "manual",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
  return data.id as string;
}

/**
 * Fields the user edits are recorded in user_verified_fields so the Gmail
 * detection pipeline never silently overwrites a manual correction
 * (PRD §36) -- see lib/gmail/candidates.ts (milestone 6) for the read side.
 */
export async function updateSubscription(
  id: string,
  input: SubscriptionFormValues,
) {
  const { supabase, user } = await requireUser();
  const values = subscriptionFormSchema.parse(input);
  const row = toRow(values);

  const { data: existing, error: fetchError } = await supabase
    .from("subscriptions")
    .select("user_verified_fields")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const previouslyVerified: string[] = existing?.user_verified_fields ?? [];
  const nowVerified = Array.from(
    new Set([...previouslyVerified, ...Object.keys(row)]),
  );

  const { error } = await supabase
    .from("subscriptions")
    .update({
      ...row,
      user_verified_fields: nowVerified,
      is_user_verified: true,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
  revalidatePath(`/subscriptions/${id}`);
}

export async function markCancelled(id: string, accessUntilDate?: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      access_until_date: accessUntilDate || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
  revalidatePath(`/subscriptions/${id}`);
}

export async function deleteSubscription(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
}
