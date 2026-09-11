export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-6 py-16">
      <div className="glow pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full" />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </main>
  );
}
