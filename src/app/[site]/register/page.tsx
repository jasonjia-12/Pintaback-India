import { redirect } from "next/navigation";
import { getSite } from "@/lib/sites";
import { readSession } from "@/lib/session";
import { RegisterForm } from "@/components/AuthForms";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { site: slug } = await params;
  const sp = await searchParams;
  const site = await getSite(slug);
  if (!site) return null;
  const session = await readSession();
  if (session) {
    if (session.role === "buyer") redirect(sp.next?.startsWith(`/${site.id}/`) ? sp.next : `/${site.id}/orders`);
    redirect("/dashboard");
  }
  const next = sp.next?.startsWith(`/${site.id}/`) ? sp.next : `/${site.id}/products`;
  return (
    <div className="container-page max-w-3xl py-14">
      <p className="label-sm text-ochre">New buyer account</p>
      <h1 className="mt-2.5 text-[28px] leading-tight">Register your business — {site.countryName}</h1>
      <p className="mt-2 text-sm text-ink/55">
        One profile for browsing, simulated orders and future online purchasing on {site.name}. Priced in {site.currency}.
      </p>
      <div className="mt-7">
        <RegisterForm site={site} next={next} />
      </div>
    </div>
  );
}
