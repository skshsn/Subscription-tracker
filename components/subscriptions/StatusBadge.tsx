import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT = {
  active: "success",
  trial: "warning",
  paused: "neutral",
  cancelled: "danger",
  expired: "danger",
  unknown: "neutral",
} as const;

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
  unknown: "Unknown",
};

export function StatusBadge({
  status,
  accessUntilDate,
}: {
  status: string;
  accessUntilDate?: string | null;
}) {
  const variant = STATUS_VARIANT[status as keyof typeof STATUS_VARIANT] ?? "neutral";
  const label =
    status === "cancelled" && accessUntilDate
      ? `Cancelled — access until ${new Date(accessUntilDate).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric" },
        )}`
      : (STATUS_LABEL[status] ?? status);

  return <Badge variant={variant}>{label}</Badge>;
}
