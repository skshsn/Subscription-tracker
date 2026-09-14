import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderDigest, type ReminderEmailItem } from "@/lib/email/resend";

const MONTHLY_BUCKET = ["weekly", "monthly", "quarterly", "half_yearly", "custom"];

interface DueRow {
  user_id: string;
  subscription_id: string;
  reminder_type: "renewal" | "trial_end";
  cycle_key: string;
  merchant_name: string;
  price: number;
  currency: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  // Fetch every user's notification preferences up front -- most users
  // won't have a row yet (defaults apply), so we fall back per-subscription.
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, email_enabled, reminder_days_monthly, reminder_days_annual, reminder_days_trial");

  const prefsByUser = new Map((prefs ?? []).map((p) => [p.user_id, p]));

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, merchant_name, price, currency, billing_frequency, status, next_billing_date, trial_end_date",
    )
    .in("status", ["active", "trial"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dueRows: DueRow[] = [];

  for (const sub of subscriptions ?? []) {
    const pref = prefsByUser.get(sub.user_id);
    if (pref && pref.email_enabled === false) continue;

    const daysMonthly = pref?.reminder_days_monthly ?? 2;
    const daysAnnual = pref?.reminder_days_annual ?? 7;
    const daysTrial = pref?.reminder_days_trial ?? 3;

    if (sub.status === "trial" && sub.trial_end_date) {
      if (isDueInDays(sub.trial_end_date, daysTrial, todayIso)) {
        dueRows.push({
          user_id: sub.user_id,
          subscription_id: sub.id,
          reminder_type: "trial_end",
          cycle_key: sub.trial_end_date,
          merchant_name: sub.merchant_name,
          price: Number(sub.price),
          currency: sub.currency,
        });
      }
    }

    if (sub.next_billing_date) {
      const leadDays = MONTHLY_BUCKET.includes(sub.billing_frequency)
        ? daysMonthly
        : daysAnnual;
      if (isDueInDays(sub.next_billing_date, leadDays, todayIso)) {
        dueRows.push({
          user_id: sub.user_id,
          subscription_id: sub.id,
          reminder_type: "renewal",
          cycle_key: sub.next_billing_date,
          merchant_name: sub.merchant_name,
          price: Number(sub.price),
          currency: sub.currency,
        });
      }
    }
  }

  if (dueRows.length === 0) {
    return NextResponse.json({ sent: 0, users: 0 });
  }

  // Idempotency: ON CONFLICT DO NOTHING via upsert+ignoreDuplicates. Rows
  // that already exist for this (subscription, type, cycle) are silently
  // skipped and returned as absent, so `inserted` is exactly "newly due".
  const { data: inserted, error: insertError } = await supabase
    .from("reminder_log")
    .upsert(
      dueRows.map((r) => ({
        user_id: r.user_id,
        subscription_id: r.subscription_id,
        reminder_type: r.reminder_type,
        cycle_key: r.cycle_key,
        status: "pending",
      })),
      { onConflict: "subscription_id,reminder_type,cycle_key", ignoreDuplicates: true },
    )
    .select("id, user_id, subscription_id, reminder_type, cycle_key");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const insertedKeys = new Set(
    (inserted ?? []).map((r) => `${r.subscription_id}:${r.reminder_type}:${r.cycle_key}`),
  );
  const toSend = dueRows.filter((r) =>
    insertedKeys.has(`${r.subscription_id}:${r.reminder_type}:${r.cycle_key}`),
  );

  const byUser = new Map<string, DueRow[]>();
  for (const row of toSend) {
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
  }

  let sentCount = 0;

  for (const [userId, rows] of byUser) {
    const logRows = inserted!.filter((r) => r.user_id === userId);

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) continue;

    const items: ReminderEmailItem[] = rows.map((r) => ({
      merchantName: r.merchant_name,
      price: r.price,
      currency: r.currency,
      date: r.cycle_key,
      kind: r.reminder_type,
    }));

    try {
      const messageId = await sendReminderDigest(email, items);
      await supabase
        .from("reminder_log")
        .update({ status: "sent", sent_at: new Date().toISOString(), email_provider_message_id: messageId })
        .in("id", logRows.map((l) => l.id));
      sentCount += rows.length;
    } catch (err) {
      await supabase
        .from("reminder_log")
        .update({ status: "failed", error: err instanceof Error ? err.message : "unknown error" })
        .in("id", logRows.map((l) => l.id));
    }
  }

  return NextResponse.json({ sent: sentCount, users: byUser.size });
}

function isDueInDays(dateStr: string, leadDays: number, todayIso: string): boolean {
  const today = new Date(todayIso);
  const target = new Date(dateStr);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  return diffDays === leadDays;
}
