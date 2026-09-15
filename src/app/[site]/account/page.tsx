import Link from "next/link";
import { redirect } from "next/navigation";
import { getSite } from "@/lib/sites";
import { readSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: slug } = await params;
  const site = await getSite(slug);
  const session = await readSession();
  if (!site) return null;
  if (!session) redirect(`/${site.id}/login`);
  if (session.role !== "buyer") redirect("/dashboard");
  return (
    <div className="container-page max-w-2xl py-12">
      <p className="label-sm text-ochre">Account</p>
      <h1 className="mt-2.5 text-[28px] leading-tight">My account</h1>
      <p className="mt-2 text-sm text-ink/55">{session.email}</p>
      <div className="card mt-7 divide-y divide-line text-sm">
        <div className="flex justify-between px-6 py-3.5"><span className="text-ink/50">Signed in as</span><span className="font-semibold">{session.name}</span></div>
        <div className="flex justify-between px-6 py-3.5"><span className="text-ink/50">Country site</span><span className="font-semibold">{site.countryName} ({site.currency})</span></div>
        <div className="flex flex-wrap gap-3 px-6 py-4">
          <Link href={`/${site.id}/orders`} className="rounded-md bg-pine-600 px-4 py-2 font-semibold text-white transition hover:bg-pine-700">My orders</Link>
          <Link href={`/${site.id}/products`} className="rounded-md border border-line bg-white px-4 py-2 font-semibold transition hover:border-pine-600">Browse catalog</Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
