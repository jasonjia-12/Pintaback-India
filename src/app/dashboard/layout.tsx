import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/roles";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await readSession();
  if (!session) redirect("/in/login");
  if (session.role === "buyer") redirect(`/${session.siteId}/orders`);
  const nav = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/orders", label: "Orders" },
    { href: "/dashboard/buyers", label: "Buyers (CRM)" },
    { href: "/dashboard/notifications", label: "Notifications" },
  ];
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-pine-950 bg-pine-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/70">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-ochre-light" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </span>
            <span>
              <span className="block font-serif text-base font-semibold tracking-tight">Pintaback Console</span>
              <span className="label-sm block text-pine-200/80">{ROLE_LABEL[session.role]}</span>
            </span>
          </Link>
          <nav className="label-sm flex flex-wrap items-center gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white">
                {n.label}
              </Link>
            ))}
            <Link href={`/${session.siteId ?? "in"}`} className="ml-1 rounded-md border border-white/25 px-3 py-2 hover:bg-white/10">
              View storefront
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
