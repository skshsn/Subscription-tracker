import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardIconButton } from "@/components/ui/card";
import { formatMoney } from "@/lib/currency";
import type { DashboardSummary } from "@/lib/dashboard";

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardIconButton>
          <ArrowUpRight size={14} />
        </CardIconButton>
      </CardHeader>
      <p className="text-3xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-2">{sub}</p>}
    </Card>
  );
}

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const primary = summary.byCurrency[0];
  const others = summary.byCurrency.slice(1);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Monthly spend"
        value={primary ? formatMoney(primary.monthly, primary.currency) : "—"}
        sub={
          others.length > 0
            ? `+ ${others.map((o) => formatMoney(o.monthly, o.currency)).join(", ")}`
            : undefined
        }
      />
      <StatCard
        title="Annual spend"
        value={primary ? formatMoney(primary.annual, primary.currency) : "—"}
        sub={
          others.length > 0
            ? `+ ${others.map((o) => formatMoney(o.annual, o.currency)).join(", ")}`
            : undefined
        }
      />
      <StatCard
        title="Active subscriptions"
        value={String(summary.activeCount)}
        sub={summary.trialCount > 0 ? `${summary.trialCount} on trial` : undefined}
      />
      <StatCard
        title="Renewing this week"
        value={String(summary.renewingSoonCount)}
      />
    </div>
  );
}
