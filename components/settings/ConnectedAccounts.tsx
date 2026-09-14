"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { disconnectGmail } from "@/actions/gmail";

export interface GmailStatus {
  gmail_address: string;
  status: "connected" | "revoked" | "error";
  last_scanned_at: string | null;
}

export function ConnectedAccounts({ gmail }: { gmail: GmailStatus | null }) {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleScanNow() {
    setPending(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/gmail/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setScanResult(
        `Scanned ${data.scanned} emails, found ${data.created} new candidate${data.created === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setScanResult(err instanceof Error ? err.message : "Scan failed");
    }
    setPending(false);
    router.refresh();
  }

  async function handleDisconnect() {
    setPending(true);
    await disconnectGmail();
    setPending(false);
    router.refresh();
  }

  if (!gmail) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Connect Gmail to automatically detect subscriptions from your
          inbox. We only scan billing-related emails and never store full
          message bodies.
        </p>
        <a href="/api/gmail/oauth/start">
          <Button size="sm">Connect Gmail</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{gmail.gmail_address}</p>
          <p className="text-xs text-muted-2">
            {gmail.last_scanned_at
              ? `Last scanned ${new Date(gmail.last_scanned_at).toLocaleString()}`
              : "Not scanned yet"}
          </p>
        </div>
        <Badge variant={gmail.status === "connected" ? "success" : "danger"}>
          {gmail.status === "connected" ? "Connected" : "Needs reconnect"}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={pending} onClick={handleScanNow}>
          Scan now
        </Button>
        <Button size="sm" variant="danger" disabled={pending} onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>
      {scanResult && <p className="text-sm text-muted">{scanResult}</p>}
    </div>
  );
}
