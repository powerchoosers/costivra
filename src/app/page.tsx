import { HomePage } from "@/components/home-page";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";
import { getPublicBillingCatalog } from "@/lib/billing/catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const plans = await getPublicBillingCatalog();
  return <><MarketingHeader /><HomePage plans={plans} /><MarketingFooter /></>;
}
