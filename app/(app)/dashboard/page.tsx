import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">
        Dashboard
      </h1>
      <Card>
        <p className="text-muted">
          You&apos;re signed in. Subscription tracking UI lands here next.
        </p>
      </Card>
    </div>
  );
}
