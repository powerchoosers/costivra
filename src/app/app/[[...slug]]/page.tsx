import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PortalPage } from "@/components/portal-pages";
import { getPortalData } from "@/lib/portal/repository";

export const metadata: Metadata = { title: "Customer workspace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const data = await getPortalData();
  return <AppShell data={data}><PortalPage slug={slug?.[0]} data={data} /></AppShell>;
}
