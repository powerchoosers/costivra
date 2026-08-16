import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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

  // Do not let an ID from another organization fall through to the client
  // detail renderer. Returning a normal 404 keeps cross-tenant probes safe
  // and avoids exposing a server error for an object outside this workspace.
  const page = slug?.[0] ?? "overview";
  if (slug?.[1] && (page === "bills" || page === "documents")) {
    const knownDocument = data.documents.some((item) => item.id === slug[1]);
    const knownInvoice = data.invoices.some((item) => item.id === slug[1]);
    if (!knownDocument && !knownInvoice) notFound();
  }

  return <AppShell data={data}><PortalPage slug={slug} data={data} /></AppShell>;
}
