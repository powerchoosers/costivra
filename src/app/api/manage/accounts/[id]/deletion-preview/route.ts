import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await requireInternalOperator();
    const organizationId = cleanUuid((await params).id);
    if (!organizationId) {
      return NextResponse.json({ error: "Invalid account ID." }, { status: 400 });
    }

    const { data: org } = await db
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .maybeSingle();

    if (!org) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const [memRes, conRes, docRes, invRes, expRes, cntRes, oppRes, actRes, savRes, venRes, mailRes, taskRes] = await Promise.all([
      db.from("organization_memberships").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("crm_contacts").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("documents").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("invoices").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("expenses").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("contracts").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("opportunities").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("action_plans").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("savings_outcomes").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("organization_vendors").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("crm_email_threads").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("crm_tasks").select("id", { count: "exact" }).eq("organization_id", organizationId),
    ]);

    const memberships = memRes.count ?? 0;
    const contacts = conRes.count ?? 0;
    const documents = docRes.count ?? 0;
    const invoices = invRes.count ?? 0;
    const expenses = expRes.count ?? 0;
    const contracts = cntRes.count ?? 0;
    const opportunities = oppRes.count ?? 0;
    const actions = actRes.count ?? 0;
    const savings = savRes.count ?? 0;
    const vendors = venRes.count ?? 0;
    const mailThreads = mailRes.count ?? 0;
    const tasks = taskRes.count ?? 0;

    const blocked = memberships > 0 || invoices > 0 || expenses > 0 || documents > 0;
    const blockReason = blocked
      ? `This account cannot be permanently deleted because it has active customer history (${memberships} member(s), ${documents} document(s), ${invoices} invoice(s)). Archive the account instead.`
      : undefined;

    return NextResponse.json({
      organizationId,
      accountName: org.name,
      blocked,
      blockReason,
      counts: [
        { label: "Workspace Memberships", count: memberships },
        { label: "CRM Contacts", count: contacts },
        { label: "Documents", count: documents },
        { label: "Invoices", count: invoices },
        { label: "Expenses", count: expenses },
        { label: "Contracts", count: contracts },
        { label: "Opportunities", count: opportunities },
        { label: "Actions", count: actions },
        { label: "Savings Outcomes", count: savings },
        { label: "Vendor Relationships", count: vendors },
        { label: "Mail Threads", count: mailThreads },
        { label: "Tasks", count: tasks },
      ],
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
