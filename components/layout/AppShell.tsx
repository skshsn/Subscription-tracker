"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Wallet,
  Inbox,
  Settings,
  Search,
  Bell,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/subscriptions", label: "Subscriptions", icon: Wallet },
  { href: "/candidates", label: "Candidates", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-border-subtle bg-surface py-6">
        <Link
          href="/dashboard"
          className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground"
        >
          $
        </Link>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <Icon size={18} />
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          title="Log out"
          className="mt-auto flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-danger"
        >
          <LogOut size={18} />
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border-subtle px-8 py-4">
          <div className="flex h-10 w-72 items-center gap-2 rounded-full bg-surface-raised px-4 text-sm text-muted-2">
            <Search size={16} />
            Search here…
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-muted hover:text-foreground">
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                {email.slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden text-muted sm:inline">{email}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
