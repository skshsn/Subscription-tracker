import "server-only";
import { Resend } from "resend";
import { formatMoney } from "@/lib/currency";

export interface ReminderEmailItem {
  merchantName: string;
  price: number;
  currency: string;
  date: string;
  kind: "renewal" | "trial_end";
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export function renderReminderDigest(items: ReminderEmailItem[]) {
  const subject =
    items.length === 1
      ? `${items[0].merchantName} ${items[0].kind === "trial_end" ? "trial ends" : "renews"} soon`
      : `${items.length} subscriptions need your attention`;

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;color:#f5f5f5;font-weight:600;">${item.merchantName}</td>
          <td style="padding:8px 0;color:#9a9a9a;">${
            item.kind === "trial_end" ? "Trial ends" : "Renews"
          } ${new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
          <td style="padding:8px 0;text-align:right;color:#f5f5f5;">${formatMoney(item.price, item.currency)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="background:#0b0b0b;padding:32px;font-family:sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#141414;border-radius:16px;padding:24px;">
        <h1 style="color:#f5f5f5;font-size:20px;margin:0 0 16px;">${subject}</h1>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <p style="color:#6f6f6f;font-size:12px;margin-top:24px;">
          Manage or cancel any of these from your Subscription Tracker dashboard.
        </p>
      </div>
    </div>`;

  return { subject, html };
}

export async function sendReminderDigest(to: string, items: ReminderEmailItem[]) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend || !from) {
    throw new Error("RESEND_API_KEY / RESEND_FROM_EMAIL not configured");
  }

  const { subject, html } = renderReminderDigest(items);
  const { data, error } = await resend.emails.send({ from, to, subject, html });

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
