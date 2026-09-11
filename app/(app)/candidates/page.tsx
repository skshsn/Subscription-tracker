import { Card } from "@/components/ui/card";

export default function CandidatesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">
        Candidates
      </h1>
      <Card>
        <p className="text-muted">
          Nothing to review right now. Connect Gmail in Settings to detect
          subscriptions automatically.
        </p>
      </Card>
    </div>
  );
}
