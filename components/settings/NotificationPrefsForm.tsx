"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  updateNotificationPreferences,
  type NotificationPreferencesInput,
} from "@/actions/settings";

export function NotificationPrefsForm({
  defaultValues,
}: {
  defaultValues: NotificationPreferencesInput;
}) {
  const [values, setValues] = useState(defaultValues);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await updateNotificationPreferences(values);
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          id="email_enabled"
          type="checkbox"
          checked={values.email_enabled}
          onChange={(e) => setValues({ ...values, email_enabled: e.target.checked })}
          className="h-4 w-4 rounded border-border-subtle accent-[var(--accent)]"
        />
        <Label htmlFor="email_enabled" className="mb-0 cursor-pointer">
          Email me renewal and trial reminders
        </Label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="reminder_days_monthly">Monthly subs (days before)</Label>
          <Input
            id="reminder_days_monthly"
            type="number"
            min={0}
            value={values.reminder_days_monthly}
            onChange={(e) =>
              setValues({ ...values, reminder_days_monthly: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label htmlFor="reminder_days_annual">Annual subs (days before)</Label>
          <Input
            id="reminder_days_annual"
            type="number"
            min={0}
            value={values.reminder_days_annual}
            onChange={(e) =>
              setValues({ ...values, reminder_days_annual: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label htmlFor="reminder_days_trial">Trials (days before end)</Label>
          <Input
            id="reminder_days_trial"
            type="number"
            min={0}
            value={values.reminder_days_trial}
            onChange={(e) =>
              setValues({ ...values, reminder_days_trial: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
        {saved && <span className="text-sm text-success">Saved.</span>}
      </div>
    </form>
  );
}
