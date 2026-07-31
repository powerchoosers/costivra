import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing-pages";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const titles: Record<string, string> = {
  product: "Product", solutions: "Solutions", "how-it-works": "How it works", pricing: "Pricing", security: "Security", integrations: "Integrations", industries: "Industries", about: "About", partners: "Partners", contact: "Contact", "case-studies": "Case studies", help: "Help center", status: "Status", scan: "Free Cost Leak Scan", login: "Sign in", signup: "Create account", privacy: "Privacy Policy", terms: "Terms of Service", "ucep-disclosure": "UCEP Relationship Disclosure",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join("/");
  return { title: titles[path] ?? titles[slug[0]] ?? "Costivra", robots: ["login", "signup"].includes(path) ? { index: false, follow: false } : undefined };
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <><MarketingHeader /><MarketingPage path={slug.join("/")} /><MarketingFooter /></>;
}
