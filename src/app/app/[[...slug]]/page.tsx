import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CustomerPage } from "@/components/customer-pages";

export const metadata: Metadata = { title: "Customer workspace", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <AppShell><CustomerPage slug={slug?.[0]} /></AppShell>;
}
