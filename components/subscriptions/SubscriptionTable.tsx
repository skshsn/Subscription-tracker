import Link from "next/link";
import { StatusBadge } from "@/components/subscriptions/StatusBadge";
import { formatMoney, FREQUENCY_LABEL, type BillingFrequency } from "@/lib/currency";

export interface SubscriptionRow {
  id: string;
  merchant_name: string;
  category_name: string | null;
  price: number;
  currency: string;
  billing_frequency: BillingFrequency;
  next_billing_date: string | null;
  status: string;
  access_until_date: string | null;
}

export function SubscriptionTable({ rows }: { rows: SubscriptionRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted">No subscriptions match these filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-2">
            <th className="pb-3 font-medium">Subscription</th>
            <th className="pb-3 font-medium">Frequency</th>
            <th className="pb-3 font-medium">Next charge</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <tr key={row.id} className="group">
              <td className="py-3">
                <Link
                  href={`/subscriptions/${row.id}`}
                  className="font-medium group-hover:text-accent"
                >
                  {row.merchant_name}
                </Link>
                {row.category_name && (
                  <p className="text-xs text-muted-2">{row.category_name}</p>
                )}
              </td>
              <td className="py-3 text-muted">
                {FREQUENCY_LABEL[row.billing_frequency]}
              </td>
              <td className="py-3 text-muted">
                {row.next_billing_date
                  ? new Date(row.next_billing_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "Renewal date unavailable"}
              </td>
              <td className="py-3">
                <StatusBadge status={row.status} accessUntilDate={row.access_until_date} />
              </td>
              <td className="py-3 text-right font-semibold">
                {formatMoney(row.price, row.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
