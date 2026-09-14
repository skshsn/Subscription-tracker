import { createClient, requireUser } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { NotificationPrefsForm } from "@/components/settings/NotificationPrefsForm";

export default async function SettingsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("email_enabled, reminder_days_monthly, reminder_days_annual, reminder_days_trial")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Notifications</h2>
        <p className="mb-4 text-sm text-muted">
          Choose how far ahead of a renewal or trial end we should email you.
        </p>
        <NotificationPrefsForm
          defaultValues={
            prefs ?? {
              email_enabled: true,
              reminder_days_monthly: 2,
              reminder_days_annual: 7,
              reminder_days_trial: 3,
            }
          }
        />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Connected accounts</h2>
        <p className="text-sm text-muted">
          Gmail-based automatic subscription detection isn&apos;t connected yet.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Privacy</h2>
        <p className="text-sm text-muted">
          Account deletion and data export controls land here.
        </p>
      </Card>
    </div>
  );
}
