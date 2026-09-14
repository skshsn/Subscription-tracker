import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/currency";

interface UpcomingItem {
  id: string;
  merchant_name: string;
  price: number;
  currency: string;
  next_billing_date: string;
}

function relativeDay(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function UpcomingCharges({ items }: { items: UpcomingItem[] }) {
  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-muted">Next 7 days</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-2">Nothing renewing this week.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3">
              <div>
                <Link
                  href={`/subscriptions/${item.id}`}
                  className="font-medium hover:text-accent"
                >
                  {item.merchant_name}
                </Link>
                <p className="text-xs text-muted-2">
                  {relativeDay(item.next_billing_date)}
                </p>
              </div>
              <span className="font-semibold">
                {formatMoney(item.price, item.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
