"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getGmailConnectionStatus() {
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data } = await admin
    .from("gmail_connections")
    .select("gmail_address, status, last_scanned_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return data;
}

export async function disconnectGmail() {
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { error } = await admin
    .from("gmail_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
