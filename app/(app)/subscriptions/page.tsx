import { Card } from "@/components/ui/card";

export default function SubscriptionsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">
        Subscriptions
      </h1>
      <Card>
        <p className="text-muted">No subscriptions yet.</p>
      </Card>
    </div>
  );
}
