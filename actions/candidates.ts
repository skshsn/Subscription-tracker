"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

const CANDIDATE_TO_SUBSCRIPTION_FIELD_MAP = {
  merchant_guess: "merchant_name",
  price_guess: "price",
  currency_guess: "currency",
  frequency_guess: "billing_frequency",
  next_billing_date_guess: "next_billing_date",
} as const;

export async function confirmCandidate(candidateId: string) {
  const { supabase, user } = await requireUser();

  const { data: candidate, error: fetchError } = await supabase
    .from("detected_candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !candidate) throw new Error("Candidate not found");
  if (candidate.status !== "pending") throw new Error("Candidate already reviewed");

  let subscriptionId: string;

  if (candidate.matched_existing_subscription_id) {
    // Merge onto the existing subscription, but never overwrite a field
    // the user has manually verified (PRD §36) -- this is also how a
    // trial converts to active once a payment-confirmation email lands.
    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("user_verified_fields")
      .eq("id", candidate.matched_existing_subscription_id)
      .single();

    if (existingError || !existing) throw new Error("Matched subscription no longer exists");

    const verified = new Set(existing.user_verified_fields ?? []);
    const patch: Record<string, unknown> = {};

    for (const [candidateField, subField] of Object.entries(
      CANDIDATE_TO_SUBSCRIPTION_FIELD_MAP,
    )) {
      if (verified.has(subField)) continue;
      const value = candidate[candidateField as keyof typeof candidate];
      if (value !== null && value !== undefined) patch[subField] = value;
    }

    if (candidate.trial_guess && !verified.has("status")) {
      patch.status = "trial";
    } else if (!candidate.trial_guess && !verified.has("status")) {
      patch.status = "active";
    }

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(patch)
        .eq("id", candidate.matched_existing_subscription_id);
      if (updateError) throw new Error(updateError.message);
    }

    subscriptionId = candidate.matched_existing_subscription_id;
  } else {
    const { data: created, error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        provider_id: candidate.provider_id,
        merchant_name: candidate.merchant_guess ?? "Unknown subscription",
        price: candidate.price_guess ?? 0,
        currency: candidate.currency_guess ?? "USD",
        billing_frequency: candidate.frequency_guess ?? "monthly",
        next_billing_date: candidate.next_billing_date_guess,
        status: candidate.trial_guess ? "trial" : "active",
        trial_end_date: candidate.trial_guess ? candidate.next_billing_date_guess : null,
        detection_source: "email",
        detection_confidence: candidate.confidence,
        last_verified_at: new Date().toISOString(),
        email_message_ref: candidate.message_id,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);
    subscriptionId = created.id;
  }

  const { error: statusError } = await supabase
    .from("detected_candidates")
    .update({
      status: "confirmed",
      created_subscription_id: subscriptionId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  if (statusError) throw new Error(statusError.message);

  revalidatePath("/candidates");
  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
  return subscriptionId;
}

export async function rejectCandidate(candidateId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("detected_candidates")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", candidateId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/candidates");
}
