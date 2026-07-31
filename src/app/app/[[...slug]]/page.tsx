import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PortalPage } from "@/components/portal-pages";
import { getPortalData } from "@/lib/portal/repository";

export const metadata: Metadata = { title: "Customer workspace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  let data: Awaited<ReturnType<typeof getPortalData>>;
  try {
    data = await getPortalData();
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ORGANIZATION_MEMBERSHIP") {
      redirect("/access");
    }
    throw error;
  }
  return <AppShell data={data}><PortalPage slug={slug?.[0]} data={data} /></AppShell>;
}
