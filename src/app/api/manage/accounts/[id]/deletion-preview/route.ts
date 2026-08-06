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

    const [memRes, conRes, locRes, docRes, heldDocRes, invRes, expRes, expenseAccountRes, cntRes, oppRes, actRes, savRes, venRes, monitoringRes, mailRes, mailMessageRes, taskRes] = await Promise.all([
      db.from("organization_memberships").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("crm_contacts").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("locations").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("documents").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("documents").select("id", { count: "exact" }).eq("organization_id", organizationId).not("retention_hold_until", "is", null),
      db.from("invoices").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("expenses").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("expense_accounts").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("contracts").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("opportunities").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("action_plans").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("savings_outcomes").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("organization_vendors").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("vendor_monitoring_configs").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("crm_email_threads").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("crm_email_messages").select("id", { count: "exact" }).eq("organization_id", organizationId),
      db.from("crm_tasks").select("id", { count: "exact" }).eq("organization_id", organizationId),
    ]);

    const memberships = memRes.count ?? 0;
    const contacts = conRes.count ?? 0;
    const locations = locRes.count ?? 0;
    const documents = docRes.count ?? 0;
    const retentionHolds = heldDocRes.count ?? 0;
    const invoices = invRes.count ?? 0;
    const expenses = expRes.count ?? 0;
    const expenseAccounts = expenseAccountRes.count ?? 0;
    const contracts = cntRes.count ?? 0;
    const opportunities = oppRes.count ?? 0;
    const actions = actRes.count ?? 0;
    const savings = savRes.count ?? 0;
    const vendors = venRes.count ?? 0;
    const monitoring = monitoringRes.count ?? 0;
    const mailThreads = mailRes.count ?? 0;
    const mailMessages = mailMessageRes.count ?? 0;
    const tasks = taskRes.count ?? 0;

    const blocked = [memberships, contacts, locations, documents, invoices, expenses, expenseAccounts, contracts, opportunities, actions, savings, vendors, monitoring, mailThreads, mailMessages, tasks, retentionHolds].some((count) => count > 0);
    const blockReason = blocked
      ? `This account cannot be permanently deleted because it has active customer history (${memberships} member(s), ${documents} document(s), ${invoices} invoice(s)). Archive the account instead.`
      : undefined;

    return NextResponse.json({
      organizationId,
      accountName: org.name,
      blocked,
      blockReason,
      counts: [
        { key: "workspace_memberships", label: "Workspace Memberships", count: memberships },
        { key: "contacts", label: "CRM Contacts", count: contacts },
        { key: "locations", label: "Locations", count: locations },
        { key: "documents", label: "Documents", count: documents },
        { key: "retention_holds", label: "Retention Holds", count: retentionHolds },
        { key: "invoices", label: "Invoices", count: invoices },
        { key: "expenses", label: "Expenses", count: expenses },
        { key: "expense_accounts", label: "Expense Accounts", count: expenseAccounts },
        { key: "contracts", label: "Contracts", count: contracts },
        { key: "opportunities", label: "Opportunities", count: opportunities },
        { key: "actions", label: "Actions", count: actions },
        { key: "savings_outcomes", label: "Savings Outcomes", count: savings },
        { key: "vendor_relationships", label: "Vendor Relationships", count: vendors },
        { key: "monitoring_configurations", label: "Monitoring Configurations", count: monitoring },
        { key: "mail_threads", label: "Mail Threads", count: mailThreads },
        { key: "mail_messages", label: "Mail Messages", count: mailMessages },
        { key: "tasks", label: "Tasks", count: tasks },
      ],
      previewVersion: "v1",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
