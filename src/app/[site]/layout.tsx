import { notFound } from "next/navigation";
import { getSite } from "@/lib/sites";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SupportWidget from "@/components/SupportWidget";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ site: string }> }>) {
  const { site: siteSlug } = await params;
  const site = await getSite(siteSlug);
  if (!site) notFound();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader site={site} />
      <main className="flex-1">{children}</main>
      <SiteFooter site={site} />
      <SupportWidget siteId={site.id} />
    </div>
  );
}
