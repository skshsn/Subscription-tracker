"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export interface NotificationPreferencesInput {
  email_enabled: boolean;
  reminder_days_monthly: number;
  reminder_days_annual: number;
  reminder_days_trial: number;
}

export async function updateNotificationPreferences(
  input: NotificationPreferencesInput,
) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    ...input,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
