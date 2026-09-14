"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markCancelled } from "@/actions/subscriptions";

const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

export function DetailActions({
  subscriptionId,
  manageUrl,
  cancelUrl,
  cancellationInstructions,
  purchasePlatform,
  status,
}: {
  subscriptionId: string;
  manageUrl: string | null;
  cancelUrl: string | null;
  cancellationInstructions: string | null;
  purchasePlatform: string;
  status: string;
}) {
  const router = useRouter();
  const [showInstructions, setShowInstructions] = useState(false);
  const [pending, setPending] = useState(false);

  // Apple-purchased subscriptions always route to Apple's own management
  // page, regardless of what the provider directory has on file (PRD §49).
  const effectiveManageUrl =
    purchasePlatform === "apple" ? APPLE_SUBSCRIPTIONS_URL : manageUrl;
  const effectiveCancelUrl =
    purchasePlatform === "apple" ? APPLE_SUBSCRIPTIONS_URL : cancelUrl;

  async function handleMarkCancelled() {
    setPending(true);
    const accessUntil = window.prompt(
      "Access until date (YYYY-MM-DD), leave blank if access ends immediately:",
    );
    await markCancelled(subscriptionId, accessUntil || undefined);
    router.refresh();
    setPending(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {effectiveManageUrl ? (
          <a href={effectiveManageUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary" className="w-full">
              Manage subscription
            </Button>
          </a>
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            Manage subscription
          </Button>
        )}

        {effectiveCancelUrl ? (
          <a href={effectiveCancelUrl} target="_blank" rel="noreferrer">
            <Button variant="danger" className="w-full">
              Cancel subscription
            </Button>
          </a>
        ) : cancellationInstructions ? (
          <Button
            variant="danger"
            className="w-full"
            onClick={() => setShowInstructions(true)}
          >
            Cancel subscription
          </Button>
        ) : (
          <Button variant="danger" className="w-full" disabled>
            No cancel link on file
          </Button>
        )}
      </div>

      {showInstructions && cancellationInstructions && (
        <div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface-raised p-4 text-sm">
          <p className="mb-2 font-medium">How to cancel</p>
          <p className="whitespace-pre-line text-muted">
            {cancellationInstructions}
          </p>
          <p className="mt-3 text-xs text-muted-2">
            Cancellation is confirmed only once the provider shows you a
            confirmation screen.
          </p>
        </div>
      )}

      {status !== "cancelled" && (
        <Button
          variant="ghost"
          className="w-full"
          disabled={pending}
          onClick={handleMarkCancelled}
        >
          Mark as cancelled
        </Button>
      )}
    </div>
  );
}
