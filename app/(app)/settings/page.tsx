import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">
        Settings
      </h1>
      <Card>
        <p className="text-muted">
          Connected accounts, notification preferences, and privacy controls
          land here.
        </p>
      </Card>
    </div>
  );
}
