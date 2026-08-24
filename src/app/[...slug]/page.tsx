import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing-pages";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";
import { getPublicBillingCatalog } from "@/lib/billing/catalog";

const titles: Record<string, string> = {
  product: "Product", solutions: "Solutions", "how-it-works": "How it works", pricing: "Pricing", security: "Security", integrations: "Integrations", industries: "Industries", about: "About", partners: "Partners", contact: "Contact", "case-studies": "Case studies", help: "Help center", status: "Status", scan: "Free Cost Leak Scan", "free-bill-review": "Review Your Business Bills Free | Costivra", login: "Sign in", signup: "Create account", privacy: "Privacy Policy", terms: "Terms of Service", "ucep-disclosure": "UCEP Relationship Disclosure",
  "solutions/software": "Software Subscription Monitoring | Costivra",
  "solutions/telecom": "Telecom & Connectivity Monitoring | Costivra",
  "solutions/energy": "Commercial Energy & Tariff Review | Costivra",
  "solutions/insurance": "Commercial Insurance & Employee Benefits Audit | Costivra",
  "solutions/facilities": "Facilities, Waste & Property Expense Monitoring | Costivra",
  "services/software-monitoring": "Software Subscription Monitoring & Seat Audit | Costivra",
  "services/telecom-monitoring": "Telecom & Circuit Expense Monitoring | Costivra",
  "services/energy-monitoring": "Commercial Energy Tariff & Supply Monitoring | Costivra",
  "services/insurance-monitoring": "Commercial Insurance & Benefits Audit | Costivra",
  "services/facilities-monitoring": "Facilities & Waste Expense Monitoring | Costivra",
  "services/merchant-monitoring": "Merchant Processing & Interchange Audit | Costivra",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join("/");
  return { title: titles[path] ?? titles[slug[0]] ?? "Costivra", robots: ["login", "signup"].includes(path) ? { index: false, follow: false } : undefined };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const plans = await getPublicBillingCatalog();
  return <><MarketingHeader /><MarketingPage path={slug.join("/")} plans={plans} /><MarketingFooter /></>;
}
