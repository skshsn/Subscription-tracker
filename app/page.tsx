import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="glow pointer-events-none absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full" />
      <div className="glow pointer-events-none absolute -right-40 top-20 h-[420px] w-[420px] rounded-full opacity-60" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
            $
          </span>
          Sub<span className="text-accent">Track</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="secondary" size="sm">
              Sign up
            </Button>
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-6 inline-flex items-center rounded-full bg-surface-raised px-4 py-1.5 text-xs font-medium text-muted">
          Discover · Understand · Monitor · Decide · Act
        </span>
        <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Know exactly what you&apos;re{" "}
          <span className="text-accent">paying for.</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-lg text-muted">
          One place to see, manage, and stop every recurring subscription —
          before money leaves your account.
        </p>
        <div className="mt-10">
          <Link href="/signup">
            <Button size="lg">Find my subscriptions</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
