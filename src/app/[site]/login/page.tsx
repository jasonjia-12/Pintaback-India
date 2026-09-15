import { redirect } from "next/navigation";
import { getSite } from "@/lib/sites";
import { readSession } from "@/lib/session";
import { LoginForm } from "@/components/AuthForms";

export const dynamic = "force-dynamic";

export default async function LoginPage({
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
    if (session.role === "buyer") redirect(sp.next && sp.next.startsWith(`/${site.id}/`) ? sp.next : `/${site.id}/orders`);
    redirect("/dashboard");
  }
  const next = sp.next?.startsWith(`/${site.id}/`) ? sp.next : `/${site.id}/orders`;
  return (
    <div className="container-page max-w-lg py-14">
      <p className="label-sm text-ochre">Business account</p>
      <h1 className="mt-2.5 text-[28px] leading-tight">Sign in to {site.name}</h1>
      <p className="mt-2 text-sm text-ink/55">Use your business account to submit and track orders.</p>
      <div className="mt-7">
        <LoginForm site={site} next={next} />
      </div>
    </div>
  );
}
