import { createClient, requireUser } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { NotificationPrefsForm } from "@/components/settings/NotificationPrefsForm";
import { ConnectedAccounts } from "@/components/settings/ConnectedAccounts";
import { getGmailConnectionStatus } from "@/actions/gmail";

export default async function SettingsPage(props: PageProps<"/settings">) {
  const searchParams = await props.searchParams;
  const { user } = await requireUser();
  const supabase = await createClient();

  const [{ data: prefs }, gmail] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("email_enabled, reminder_days_monthly, reminder_days_annual, reminder_days_trial")
      .eq("user_id", user.id)
      .maybeSingle(),
    getGmailConnectionStatus(),
  ]);

  const gmailError = typeof searchParams.gmail_error === "string" ? searchParams.gmail_error : null;
  const gmailConnected = searchParams.gmail_connected === "1";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      {gmailError && (
        <div className="rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Couldn&apos;t connect Gmail: {gmailError}
        </div>
      )}
      {gmailConnected && (
        <div className="rounded-[var(--radius-md)] border border-success/30 bg-success/10 p-4 text-sm text-success">
          Gmail connected successfully.
        </div>
      )}

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
        <h2 className="mb-3 text-lg font-semibold">Connected accounts</h2>
        <ConnectedAccounts gmail={gmail} />
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
