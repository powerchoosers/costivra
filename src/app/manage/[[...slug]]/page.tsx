import type { Metadata } from "next";
import { ManageAccessDenied } from "@/components/manage-access-denied";
import { ManagePortal } from "@/components/manage-portal";
import { getManageData } from "@/lib/manage/repository";
import { getManageInvoiceReviewData } from "@/lib/manage/invoice-review";
import { getManageIntakeOperationsData } from "@/lib/manage/intake-operations";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Owner operations",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadManagePageData(input: {
  folder?: string;
  threadId?: string | null;
  mailboxId?: string | null;
  accountId?: string | null;
}) {
  try {
    return { authorized: true as const, data: await getManageData(input) };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INTERNAL_ACCESS_REQUIRED"
    ) {
      return { authorized: false as const, data: null };
    }
    throw error;
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ folder?: string; mailbox?: string }>;
}) {
  const { slug = [] } = await params;
  const { folder, mailbox } = await searchParams;
  const section = slug[0] || "overview";
  if (section === "mailboxes") redirect("/manage/settings#email-identities");
  const result = await loadManagePageData({
    folder,
    mailboxId: mailbox,
    threadId: section === "mail" ? slug[1] : null,
    accountId: section === "accounts" ? slug[1] ?? null : null,
  });
  if (!result.authorized) return <ManageAccessDenied />;
  const invoiceReview = section === "invoice-review"
    ? await getManageInvoiceReviewData(slug[1] ?? null)
    : null;
  const intakeOperations = section === "intake"
    ? await getManageIntakeOperationsData(slug[1] ?? null)
    : null;
  return <ManagePortal
    section={section}
    detailId={section === "accounts" || section === "contacts" ? slug[1] ?? null : null}
    data={result.data}
    invoiceReview={invoiceReview}
    intakeOperations={intakeOperations}
  />;
}
