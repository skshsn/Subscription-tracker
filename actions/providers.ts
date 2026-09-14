"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchProviders(query: string) {
  if (query.trim().length < 1) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("providers")
    .select(
      "id, name, category_id:default_category_id, manage_url, cancel_url, cancellation_instructions:instructions, cancellation_method, platform_variations",
    )
    .ilike("name", `%${query}%`)
    .limit(8);

  if (error) throw new Error(error.message);
  return data ?? [];
}
