"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowLeft,
  AtSign,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  MailOpen,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  Users,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type {
  ManageAccount,
  ManageActivity,
  ManageContact,
  ManageData,
  ManageMailbox,
  ManageMailThread,
} from "@/lib/manage/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import { CostivraMark } from "@/components/brand";
import { ManageLiveNotifications } from "@/components/manage-live-notifications";
import { CostivraSelect } from "@/components/ui/costivra-select";
import { CostivraDateTimePicker } from "@/components/ui/costivra-date-time-picker";

const nav = [
  ["Overview", "/manage", LayoutDashboard],
  ["Accounts", "/manage/accounts", Building2],
  ["Contacts", "/manage/contacts", Users],
  ["Outreach", "/manage/outreach", MessageSquareText],
  ["Mail", "/manage/mail", Mail],
  ["Mailboxes", "/manage/mailboxes", AtSign],
  ["Activity", "/manage/activity", Activity],
] as const;

const stages = [
  "lead",
  "onboarding",
  "active",
  "at_risk",
  "inactive",
  "closed",
];
const stageLabel = (stage: string | null) =>
  stage ? stage.replaceAll("_", " ") : "Unclassified";
const pretty = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value: string | null, withTime = false) =>
  value
    ? new Intl.DateTimeFormat(
        "en-US",
        withTime
          ? {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }
          : { month: "short", day: "numeric", year: "numeric" },
      ).format(new Date(value))
    : "—";
const initials = (value: string) =>
  value
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

type ComposeContext = {
  mode: "new" | "reply" | "forward";
  organizationId?: string;
  to?: string;
  subject?: string;
  body?: string;
  threadId?: string;
  mailboxId?: string;
};

async function api(url: string, init: RequestInit) {
  const response = await fetch(
    url,
    init.headers
      ? init
      : { ...init, headers: { "content-type": "application/json" } },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    threadId?: string;
  };
  if (!response.ok)
    throw new Error(payload.error || "That action could not be completed.");
  return payload;
}

function Status({ value }: { value: string | null }) {
  const key = value || "unclassified";
  return (
    <span className={`manage-status manage-status--${key}`}>
      <i />
      {stageLabel(value)}
    </span>
  );
}

function MarketingConsent({
  count,
  compact = false,
}: {
  count: number;
  compact?: boolean;
}) {
  return count > 0 ? (
    <span
      className={`manage-marketing-consent${compact ? " is-compact" : ""}`}
      title={`${count} contact${count === 1 ? "" : "s"} opted in to email marketing`}
    >
      <Check aria-hidden="true" size={compact ? 11 : 13} />
      Marketing opt-in{count > 1 ? ` · ${count}` : ""}
    </span>
  ) : (
    <span className="manage-marketing-consent is-empty">
      No marketing opt-in
    </span>
  );
}

function Empty({
  icon: Icon,
  title,
  copy,
  action,
}: {
  icon: typeof Inbox;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="manage-empty">
      <span>
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function Modal({
  title,
  copy,
  children,
  onClose,
}: {
  title: string;
  copy?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="manage-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="manage-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {copy && <p>{copy}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function FormActions({
  busy,
  submit = "Save",
  onClose,
}: {
  busy: boolean;
  submit?: string;
  onClose: () => void;
}) {
  return (
    <footer className="manage-form-actions">
      <button
        className="manage-button manage-button--quiet"
        type="button"
        onClick={onClose}
      >
        Cancel
      </button>
      <button className="manage-button manage-button--primary" disabled={busy}>
        {busy ? "Working…" : submit}
      </button>
    </footer>
  );
}

export function ManagePortal({
  section,
  data,
}: {
  section: string;
  data: ManageData;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<
    "account" | "contact" | "task" | "note" | "mailbox" | null
  >(null);
  const [compose, setCompose] = useState<ComposeContext | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await work();
      toast.success(success);
      setDialog(null);
      router.refresh();
    } catch (error) {
      toast.error(
        "That didn’t work",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const pageTitle =
    section === "overview" ? "Client operations" : pretty(section);
  return (
    <div className="manage-app">
      <ManageLiveNotifications />
      <aside
        className={`manage-sidebar${mobileNav ? " is-open" : ""}${
          sidebarCollapsed ? " is-collapsed" : ""
        }`}
      >
        <div className="manage-brand">
          <Link href="/manage" title="Costivra Owner Operations">
            <span className="manage-brand-mark">
              <CostivraMark size={34} />
            </span>
            {!sidebarCollapsed && (
              <div>
                <strong>Costivra</strong>
                <small>OWNER OPERATIONS</small>
              </div>
            )}
          </Link>
          {!sidebarCollapsed && (
            <button
              className="manage-sidebar-toggle"
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={17} />
            </button>
          )}
          <button
            className="manage-mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav aria-label="Owner portal">
          {nav.map(([label, href, Icon]) => {
            const active =
              href === "/manage"
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <Link
                className={active ? "active" : ""}
                href={href}
                key={href}
                aria-label={label}
                onClick={() => setMobileNav(false)}
              >
                <Icon size={18} />
                <span className="manage-nav-label">{label}</span>
                {label === "Mail" && data.mail.unreadCount > 0 && (
                  <b>{data.mail.unreadCount}</b>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="manage-sidebar-foot">
          <div className="manage-operator">
            <span>{initials(data.operator.fullName)}</span>
            <div>
              <strong>{data.operator.fullName}</strong>
              <small>{data.operator.role}</small>
            </div>
            <button aria-label="Account menu">
              <MoreHorizontal size={17} />
            </button>
          </div>
          <button onClick={() => void signOut()}>Sign out</button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="manage-nav-scrim"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className={`manage-main${sidebarCollapsed ? " is-collapsed" : ""}`}>
        <header className="manage-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {sidebarCollapsed && (
              <button
                className="manage-topbar-expand-toggle"
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen size={18} />
              </button>
            )}
            <button
              className="manage-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <small>COSTIVRA INTERNAL</small>
              <h1>{pageTitle}</h1>
            </div>
          </div>
          <div className="manage-top-actions">
            <label className="manage-search">
              <Search size={16} />
              <input
                aria-label="Search this page"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records"
              />
            </label>
            {section === "mail" ? (
              <button
                className="manage-button manage-button--primary"
                onClick={() => setCompose({ mode: "new" })}
                disabled={!data.mail.mailboxes.some(
                  (mailbox) =>
                    mailbox.status === "active" && mailbox.canSend,
                )}
              >
                <PenLine size={16} /> Compose
              </button>
            ) : section === "mailboxes" ? null : section === "activity" ? (
              <button
                className="manage-button manage-button--primary"
                onClick={() => setDialog("note")}
              >
                <Plus size={16} /> Add note
              </button>
            ) : (
              <button
                className="manage-button manage-button--primary"
                onClick={() =>
                  setDialog(
                    section === "contacts"
                      ? "contact"
                      : section === "outreach"
                        ? "task"
                        : "account",
                  )
                }
              >
                <Plus size={16} />{" "}
                {section === "contacts"
                  ? "Add contact"
                  : section === "outreach"
                    ? "Add task"
                    : "Add account"}
              </button>
            )}
          </div>
        </header>
        <div className={`manage-page manage-page--${section}`}>
          {section === "overview" && (
            <Overview
              data={data}
              onAdd={() => setDialog("account")}
              onTask={() => setDialog("task")}
            />
          )}
          {section === "accounts" && (
            <Accounts
              data={data}
              query={search}
              onEdit={() => router.refresh()}
            />
          )}
          {section === "contacts" && (
            <Contacts
              data={data}
              query={search}
              onCompose={(contact) =>
                setCompose({
                  mode: "new",
                  organizationId: contact.organizationId,
                  to: contact.email,
                })
              }
            />
          )}
          {section === "outreach" && (
            <Outreach
              data={data}
              query={search}
              run={run}
              onTask={() => setDialog("task")}
              onNote={() => setDialog("note")}
            />
          )}
          {section === "mail" && (
            <MailPage
              data={data}
              query={search}
              run={run}
              onCompose={(context) => setCompose(context)}
            />
          )}
          {section === "mailboxes" && (
            <Mailboxes
              data={data}
              query={search}
              run={run}
              onAdd={() => setDialog("mailbox")}
            />
          )}
          {section === "activity" && (
            <ActivityPage
              data={data}
              query={search}
              onNote={() => setDialog("note")}
            />
          )}
        </div>
      </main>
      {dialog === "account" && (
        <AccountForm
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/accounts", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Account added to the live CRM.",
            )
          }
        />
      )}
      {dialog === "contact" && (
        <ContactForm
          data={data}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/contacts", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Contact added.",
            )
          }
        />
      )}
      {dialog === "task" && (
        <TaskForm
          data={data}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/tasks", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Follow-up task created.",
            )
          }
        />
      )}
      {dialog === "note" && (
        <NoteForm
          data={data}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/activities", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Note added to the activity record.",
            )
          }
        />
      )}
      {dialog === "mailbox" && (
        <MailboxForm
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/mailboxes", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Mailbox seat created and ready to use.",
            )
          }
        />
      )}
      {compose && (
        <Compose
          data={data}
          context={compose}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  );
}

function Overview({
  data,
  onAdd,
  onTask,
}: {
  data: ManageData;
  onAdd: () => void;
  onTask: () => void;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    data.accounts[0]?.id ?? null,
  );
  const [editingAccount, setEditingAccount] = useState<ManageAccount | null>(null);

  const active = data.accounts.filter(
    (account) => account.stage === "active",
  ).length;
  const followUps = data.tasks.filter((task) =>
    ["open", "in_progress"].includes(task.status),
  ).length;
  const onboarding = data.accounts.filter(
    (account) => account.stage === "onboarding",
  ).length;

  const selectedAccount =
    data.accounts.find((a) => a.id === selectedAccountId) ?? data.accounts[0];

  const accountActivities = useMemo(
    () =>
      selectedAccount
        ? data.activities.filter(
            (act) => act.organizationId === selectedAccount.id,
          )
        : [],
    [data.activities, selectedAccount],
  );

  const accountContacts = useMemo(
    () =>
      selectedAccount
        ? data.contacts.filter((c) => c.organizationId === selectedAccount.id)
        : [],
    [data.contacts, selectedAccount],
  );

  return (
    <>
      <section className="manage-intro">
        <div>
          <p>One place to manage customers, outreach, and email.</p>
          <h2>Every client relationship, in view.</h2>
        </div>
        <div>
          <button
            className="manage-button manage-button--quiet"
            onClick={onTask}
          >
            <CalendarClock size={16} /> Add follow-up
          </button>
          <button
            className="manage-button manage-button--primary"
            onClick={onAdd}
          >
            <Plus size={16} /> Add account
          </button>
        </div>
      </section>
      <section className="manage-summary" aria-label="CRM summary">
        <div>
          <small>ALL ACCOUNTS</small>
          <strong>{data.accounts.length}</strong>
          <span>Supabase organizations</span>
        </div>
        <div>
          <small>ACTIVE</small>
          <strong>{active}</strong>
          <span>Marked as active</span>
        </div>
        <div>
          <small>NEEDS FOLLOW-UP</small>
          <strong>{followUps}</strong>
          <span>Open outreach tasks</span>
        </div>
        <div>
          <small>ONBOARDING</small>
          <strong>{onboarding}</strong>
          <span>In setup</span>
        </div>
      </section>
      <div className="manage-overview-grid">
        <section className="manage-panel manage-account-table">
          <header>
            <div>
              <h3>Accounts</h3>
              <p>Live organizations and their next action. Select a row to inspect.</p>
            </div>
            <Link href="/manage/accounts">View all</Link>
          </header>
          <AccountRows
            accounts={data.accounts.slice(0, 8)}
            selectedId={selectedAccount?.id}
            onSelectAccount={(account) => setSelectedAccountId(account.id)}
          />
          {!data.accounts.length && (
            <Empty
              icon={Building2}
              title="No accounts yet"
              copy="Accounts will appear when a real organization exists in Supabase or you add one here."
              action={
                <button
                  className="manage-button manage-button--primary"
                  onClick={onAdd}
                >
                  Add first account
                </button>
              }
            />
          )}
        </section>
        <AccountInspector
          account={selectedAccount}
          activities={accountActivities}
          contacts={accountContacts}
          onEdit={(account) => setEditingAccount(account)}
        />
      </div>
      <div className="manage-lower-grid">
        <section className="manage-panel">
          <header>
            <div>
              <h3>Open follow-ups</h3>
              <p>Tasks that still need a person to act.</p>
            </div>
            <Link href="/manage/outreach">Open outreach</Link>
          </header>
          <TaskList
            tasks={data.tasks
              .filter((task) => ["open", "in_progress"].includes(task.status))
              .slice(0, 5)}
          />
          {!data.tasks.some((task) =>
            ["open", "in_progress"].includes(task.status),
          ) && (
            <Empty
              icon={CheckCircle2}
              title="No open follow-ups"
              copy="Create a real task when a client needs a call, email, meeting, or review."
            />
          )}
        </section>
        <section className="manage-panel">
          <header>
            <div>
              <h3>Recent activity</h3>
              <p>Internal notes and client touches.</p>
            </div>
            <Link href="/manage/activity">Full history</Link>
          </header>
          <ActivityList activities={data.activities.slice(0, 5)} />
          {!data.activities.length && (
            <Empty
              icon={Activity}
              title="No CRM activity yet"
              copy="New notes, tasks, and email activity will be recorded here."
            />
          )}
        </section>
      </div>
      {editingAccount && (
        <EditAccount
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </>
  );
}

function AccountRows({
  accounts,
  selectedId,
  onSelectAccount,
}: {
  accounts: ManageAccount[];
  selectedId?: string;
  onSelectAccount?: (account: ManageAccount) => void;
}) {
  return (
    <div className="manage-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Primary contact</th>
            <th>Stage</th>
            <th>Last touch</th>
            <th>Next step</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const isSelected = account.id === selectedId;
            return (
              <tr
                key={account.id}
                className={isSelected ? "is-selected" : ""}
                onClick={() => onSelectAccount?.(account)}
                style={{ cursor: onSelectAccount ? "pointer" : "default" }}
              >
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="manage-account-avatar">
                      {initials(account.name)}
                    </span>
                    <span>
                      <strong>{account.name}</strong>
                      <small>{account.industry || "Industry not set"}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <strong>{account.primaryContact || "No contact"}</strong>
                  <small>{account.primaryEmail || "—"}</small>
                  {account.marketingOptInCount > 0 && (
                    <MarketingConsent
                      count={account.marketingOptInCount}
                      compact
                    />
                  )}
                </td>
                <td>
                  <Status value={account.stage} />
                </td>
                <td>{date(account.lastContactedAt)}</td>
                <td>
                  <strong>{account.nextStep || "Not set"}</strong>
                  <small>{date(account.nextFollowUpAt)}</small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AccountInspector({
  account,
  activities = [],
  contacts = [],
  onEdit,
}: {
  account?: ManageAccount;
  activities?: ManageActivity[];
  contacts?: ManageContact[];
  onEdit?: (account: ManageAccount) => void;
}) {
  const [tab, setTab] = useState<"overview" | "timeline" | "contacts">("overview");

  if (!account)
    return (
      <aside className="manage-panel manage-inspector">
        <Empty
          icon={Building2}
          title="No account selected"
          copy="Select a real account to see its customer workspace and follow-up context."
        />
      </aside>
    );

  return (
    <aside className="manage-panel manage-inspector">
      <header>
        <div className="manage-inspector-account">
          <span>{initials(account.name)}</span>
          <div>
            <h3>{account.name}</h3>
            <p>{account.industry || "Industry not set"}</p>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(account)}
            aria-label="Edit account follow-up"
            title="Edit follow-up"
            style={{ background: "none", border: 0, color: "#667085", cursor: "pointer", padding: 4 }}
          >
            <PenLine size={16} />
          </button>
        )}
      </header>
      <div className="manage-inspector-tabs">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={tab === "timeline" ? "active" : ""}
          onClick={() => setTab("timeline")}
        >
          Timeline ({activities.length})
        </button>
        <button
          className={tab === "contacts" ? "active" : ""}
          onClick={() => setTab("contacts")}
        >
          Contacts ({contacts.length})
        </button>
      </div>

      {tab === "overview" && (
        <>
          <dl>
            <div>
              <dt>Lifecycle</dt>
              <dd>
                <Status value={account.stage} />
              </dd>
            </div>
            <div>
              <dt>Primary contact</dt>
              <dd>
                <strong>{account.primaryContact || "Not set"}</strong>
                <span>{account.primaryEmail || "No email"}</span>
              </dd>
            </div>
            <div>
              <dt>Email marketing</dt>
              <dd>
                <MarketingConsent count={account.marketingOptInCount} />
                <span>
                  {account.latestMarketingConsentAt
                    ? `Recorded ${date(account.latestMarketingConsentAt, true)}`
                    : "Consent must be explicit before marketing email is sent"}
                </span>
              </dd>
            </div>
            <div>
              <dt>Next follow-up</dt>
              <dd>
                <strong>{date(account.nextFollowUpAt)}</strong>
                <span>{account.nextStep || "No next step recorded"}</span>
              </dd>
            </div>
            {account.privateNotes && (
              <div>
                <dt>Private notes</dt>
                <dd style={{ maxWidth: 190, textAlign: "right" }}>
                  <span style={{ fontSize: "0.65rem", color: "#475467", lineHeight: 1.4 }}>
                    {account.privateNotes}
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt>Customer workspace</dt>
              <dd>
                <strong>
                  {account.memberCount} member{account.memberCount === 1 ? "" : "s"}
                </strong>
                <span>
                  {account.documentCount} documents · {account.opportunityCount}{" "}
                  opportunities
                </span>
              </dd>
            </div>
          </dl>
          {onEdit && (
            <div style={{ padding: "0 18px 14px" }}>
              <button
                className="manage-button manage-button--quiet manage-full"
                onClick={() => onEdit(account)}
              >
                Edit follow-up & notes
              </button>
            </div>
          )}
        </>
      )}

      {tab === "timeline" && (
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {activities.length > 0 ? (
            <ActivityList activities={activities} />
          ) : (
            <Empty
              icon={Activity}
              title="No activity recorded"
              copy="Notes and client interactions for this account will appear here."
            />
          )}
        </div>
      )}

      {tab === "contacts" && (
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {contacts.length > 0 ? (
            <div className="manage-compact-list">
              {contacts.map((contact) => (
                <article key={contact.id}>
                  <span className="manage-person-avatar">
                    {initials(contact.fullName)}
                  </span>
                  <div>
                    <strong>{contact.fullName}</strong>
                    <p>{contact.title || contact.email}</p>
                  </div>
                  {contact.isPrimary && (
                    <span className="manage-source">Primary</span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty
              icon={Users}
              title="No contacts"
              copy="Client contacts for this account will appear here."
            />
          )}
        </div>
      )}

      <p className="manage-inspector-note">
        Customer workspaces stay tenant-isolated. This portal shows operational
        context without impersonating a client.
      </p>
    </aside>
  );
}

function Accounts({
  data,
  query,
}: {
  data: ManageData;
  query: string;
  onEdit: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<ManageAccount | null>(null);
  const filtered = data.accounts.filter(
    (account) =>
      (filter === "all" || (account.stage || "unclassified") === filter) &&
      `${account.name} ${account.primaryContact} ${account.primaryEmail}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <section className="manage-page-heading">
        <div>
          <h2>Accounts</h2>
          <p>
            Every row below comes from the live Supabase organizations table.
          </p>
        </div>
        <span className="manage-live">
          <i /> LIVE DATABASE
        </span>
      </section>
      <section className="manage-panel manage-account-table manage-account-table--full">
        <div className="manage-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All <span>{data.accounts.length}</span>
          </button>
          {stages.slice(0, 4).map((stage) => (
            <button
              className={filter === stage ? "active" : ""}
              onClick={() => setFilter(stage)}
              key={stage}
            >
              {pretty(stage)}{" "}
              <span>
                {
                  data.accounts.filter((account) => account.stage === stage)
                    .length
                }
              </span>
            </button>
          ))}
        </div>
        <AccountRows accounts={filtered} />
        {!filtered.length && (
          <Empty
            icon={Building2}
            title="No matching accounts"
            copy={
              data.accounts.length
                ? "Clear the search or choose another lifecycle stage."
                : "No real organizations are available yet."
            }
          />
        )}
      </section>
      {filtered.length > 0 && (
        <section className="manage-account-cards">
          {filtered.map((account) => (
            <article key={account.id}>
              <div>
                <span className="manage-account-avatar">
                  {initials(account.name)}
                </span>
                <div>
                  <h3>{account.name}</h3>
                  <p>{account.primaryEmail || "No primary email"}</p>
                </div>
              </div>
              <Status value={account.stage} />
              {account.marketingOptInCount > 0 && (
                <MarketingConsent count={account.marketingOptInCount} compact />
              )}
              <dl>
                <div>
                  <dt>Open tasks</dt>
                  <dd>{account.openTaskCount}</dd>
                </div>
                <div>
                  <dt>Documents</dt>
                  <dd>{account.documentCount}</dd>
                </div>
                <div>
                  <dt>Next follow-up</dt>
                  <dd>{date(account.nextFollowUpAt)}</dd>
                </div>
              </dl>
              <button
                className="manage-button manage-button--quiet manage-full"
                onClick={() => setEditing(account)}
              >
                Edit follow-up
              </button>
            </article>
          ))}
        </section>
      )}
      {editing && (
        <EditAccount account={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function Contacts({
  data,
  query,
  onCompose,
}: {
  data: ManageData;
  query: string;
  onCompose: (contact: ManageData["contacts"][number]) => void;
}) {
  const rows = data.contacts.filter((contact) =>
    `${contact.fullName} ${contact.email} ${contact.organizationName}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <section className="manage-page-heading">
        <div>
          <h2>Contacts</h2>
          <p>
            Workspace users and owner-added client contacts in one directory.
          </p>
        </div>
        <span>
          {rows.length} contact{rows.length === 1 ? "" : "s"}
        </span>
      </section>
      <section className="manage-panel manage-contact-list">
        <div className="manage-contact-head">
          <span>Person</span>
          <span>Account</span>
          <span>Role</span>
          <span>Source</span>
          <span />
        </div>
        {rows.map((contact) => (
          <article key={contact.id}>
            <div>
              <span className="manage-person-avatar">
                {initials(contact.fullName)}
              </span>
              <div>
                <strong>{contact.fullName}</strong>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </div>
            </div>
            <div>
              <strong>{contact.organizationName}</strong>
              <small>
                {contact.isPrimary ? "Primary contact" : "Client contact"}
              </small>
            </div>
            <span>{contact.title || "Not set"}</span>
            <span className="manage-source">
              {contact.source === "workspace" ? "Workspace" : "CRM"}
            </span>
            <button
              className="manage-icon-button"
              onClick={() => onCompose(contact)}
              aria-label={`Email ${contact.fullName}`}
            >
              <Mail size={16} />
            </button>
          </article>
        ))}
        {!rows.length && (
          <Empty
            icon={Users}
            title="No matching contacts"
            copy={
              data.contacts.length
                ? "Clear the search to see the live contact directory."
                : "Contacts will appear when a workspace member exists or you add a real client contact."
            }
          />
        )}
      </section>
    </>
  );
}

function Outreach({
  data,
  query,
  run,
  onTask,
  onNote,
}: {
  data: ManageData;
  query: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onTask: () => void;
  onNote: () => void;
}) {
  const tasks = data.tasks.filter((task) =>
    `${task.title} ${task.organizationName}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <section className="manage-page-heading">
        <div>
          <h2>Outreach</h2>
          <p>
            Follow-ups, calls, meetings, and review work—without automated
            blasting.
          </p>
        </div>
        <div>
          <button
            className="manage-button manage-button--quiet"
            onClick={onNote}
          >
            <FileText size={16} /> Add note
          </button>
          <button
            className="manage-button manage-button--primary"
            onClick={onTask}
          >
            <Plus size={16} /> Add task
          </button>
        </div>
      </section>
      <section className="manage-outreach-board">
        {["open", "in_progress", "completed"].map((status) => (
          <div className="manage-task-column" key={status}>
            <header>
              <div>
                <i className={`task-dot task-dot--${status}`} />
                <h3>{pretty(status)}</h3>
              </div>
              <span>
                {tasks.filter((task) => task.status === status).length}
              </span>
            </header>
            <div>
              {tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <article key={task.id}>
                    <div>
                      <span
                        className={`manage-priority manage-priority--${task.priority}`}
                      >
                        {task.priority}
                      </span>
                      <small>{pretty(task.taskType)}</small>
                    </div>
                    <h4>{task.title}</h4>
                    <p>{task.organizationName}</p>
                    <footer>
                      <span>
                        <Clock3 size={14} /> {date(task.dueAt)}
                      </span>
                      {status !== "completed" && (
                        <button
                          onClick={() =>
                            void run(
                              () =>
                                api(`/api/manage/tasks/${task.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ status: "completed" }),
                                }),
                              "Task completed.",
                            )
                          }
                          aria-label={`Complete ${task.title}`}
                        >
                          <Check size={15} />
                        </button>
                      )}
                    </footer>
                  </article>
                ))}
              {!tasks.some((task) => task.status === status) && (
                <p className="manage-column-empty">
                  No {pretty(status).toLowerCase()} tasks.
                </p>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function Mailboxes({
  data,
  query,
  run,
  onAdd,
}: {
  data: ManageData;
  query: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onAdd: () => void;
}) {
  const mailboxes = data.mail.mailboxes.filter((mailbox) =>
    `${mailbox.displayName} ${mailbox.address} ${mailbox.mailboxType} ${mailbox.assignedToName || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <section className="manage-page-heading">
        <div>
          <p>Approved sender and receiving identities on costivra.ai.</p>
          <div className="manage-mailbox-heading-row">
            <h2>Mailbox seats</h2>
            <span>
              {mailboxes.length} mailbox{mailboxes.length === 1 ? "" : "es"}
            </span>
            {data.operator.role === "owner" && (
              <button
                className="manage-button manage-button--primary"
                onClick={onAdd}
              >
                <Plus size={15} /> New mailbox
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="manage-panel manage-mailbox-panel">
        {mailboxes.length ? (
          <>
            <div className="manage-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mailbox</th>
                    <th>Seat type</th>
                    <th>Delivery</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {mailboxes.map((mailbox) => (
                    <MailboxRow
                      mailbox={mailbox}
                      owner={data.operator.role === "owner"}
                      run={run}
                      key={mailbox.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="manage-mailbox-cards">
              {mailboxes.map((mailbox) => (
                <MailboxCard
                  mailbox={mailbox}
                  owner={data.operator.role === "owner"}
                  run={run}
                  key={mailbox.id}
                />
              ))}
            </div>
          </>
        ) : (
          <Empty
            icon={AtSign}
            title="No mailbox seats"
            copy="Create an approved Costivra address. No placeholder seats are added automatically."
            action={
              data.operator.role === "owner" ? (
                <button
                  className="manage-button manage-button--primary"
                  onClick={onAdd}
                >
                  <Plus size={15} /> New mailbox
                </button>
              ) : undefined
            }
          />
        )}
      </section>
      <p className="manage-mailbox-footnote">
        Mailbox seats work inside Costivra through Resend. They do not create an
        IMAP, Gmail, or Outlook account.
      </p>
    </>
  );
}

function MailboxCard({
  mailbox,
  owner,
  run,
}: {
  mailbox: ManageMailbox;
  owner: boolean;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const nextOperation = mailbox.status === "active" ? "disable" : "enable";
  return (
    <article>
      <header>
        <div className="manage-mailbox-identity">
          <span className="manage-person-avatar">
            {initials(mailbox.displayName)}
          </span>
          <div>
            <strong>{mailbox.displayName}</strong>
            <small>{mailbox.address}</small>
          </div>
        </div>
        <Status value={mailbox.status} />
      </header>
      <dl>
        <div>
          <dt>Seat type</dt>
          <dd>{pretty(mailbox.mailboxType)}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>
            {mailbox.canSend ? "Send" : "No send"} ·{" "}
            {mailbox.canReceive ? "Receive" : "No receive"}
          </dd>
        </div>
      </dl>
      <footer>
        <span>{mailbox.isDefault ? "Default owner inbox" : "Managed seat"}</span>
        {owner && (
          <button
            className="manage-button manage-button--quiet"
            disabled={mailbox.isDefault && nextOperation === "disable"}
            onClick={() =>
              void run(
                () =>
                  api(`/api/manage/mailboxes/${mailbox.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ operation: nextOperation }),
                  }),
                `Mailbox ${nextOperation === "enable" ? "enabled" : "disabled"}.`,
              )
            }
          >
            {nextOperation === "enable" ? "Enable" : "Disable"}
          </button>
        )}
      </footer>
    </article>
  );
}

function MailboxRow({
  mailbox,
  owner,
  run,
}: {
  mailbox: ManageMailbox;
  owner: boolean;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const nextOperation = mailbox.status === "active" ? "disable" : "enable";
  return (
    <tr>
      <td>
        <div className="manage-mailbox-identity">
          <span className="manage-person-avatar">
            {initials(mailbox.displayName)}
          </span>
          <div>
            <strong>{mailbox.displayName}</strong>
            <small>{mailbox.address}</small>
          </div>
        </div>
      </td>
      <td>
        <strong>{pretty(mailbox.mailboxType)}</strong>
        <small>{mailbox.assignedToName || "Owner administered"}</small>
      </td>
      <td>
        <div className="manage-mailbox-capabilities">
          <span className={mailbox.canSend ? "ready" : ""}>
            <i /> Send
          </span>
          <span className={mailbox.canReceive ? "ready" : ""}>
            <i /> Receive
          </span>
        </div>
      </td>
      <td>
        <Status value={mailbox.status} />
        {mailbox.isDefault && <small>Default owner inbox</small>}
      </td>
      <td className="manage-mailbox-action">
        {owner && (
          <button
            className="manage-button manage-button--quiet"
            disabled={mailbox.isDefault && nextOperation === "disable"}
            title={
              mailbox.isDefault
                ? "The default owner inbox stays active"
                : undefined
            }
            onClick={() =>
              void run(
                () =>
                  api(`/api/manage/mailboxes/${mailbox.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ operation: nextOperation }),
                  }),
                `Mailbox ${nextOperation === "enable" ? "enabled" : "disabled"}.`,
              )
            }
          >
            {nextOperation === "enable" ? "Enable" : "Disable"}
          </button>
        )}
      </td>
    </tr>
  );
}

function MailPage({
  data,
  query,
  run,
  onCompose,
}: {
  data: ManageData;
  query: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onCompose: (context: ComposeContext) => void;
}) {
  const router = useRouter();
  const current = data.mail.selectedThread;
  const activeMailboxes = data.mail.mailboxes.filter(
    (mailbox) => mailbox.status === "active",
  );
  const mailboxQuery = data.mail.selectedMailboxId
    ? `&mailbox=${data.mail.selectedMailboxId}`
    : "";
  const threads = data.mail.threads.filter((thread) =>
    `${thread.subject} ${thread.contactName} ${thread.organizationName} ${thread.snippet}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const folders = [
    ["inbox", "Inbox", Inbox],
    ["starred", "Starred", Star],
    ["sent", "Sent", Send],
    ["drafts", "Drafts", FileText],
    ["scheduled", "Scheduled", Clock3],
    ["archive", "Archive", Archive],
    ["trash", "Trash", Trash2],
  ] as const;
  const act = (operation: string) =>
    current
      ? run(
          () =>
            api(`/api/manage/mail/threads/${current.id}`, {
              method: "PATCH",
              body: JSON.stringify({ operation }),
            }),
          `Conversation ${operation === "read" ? "marked read" : operation + "d"}.`,
        )
      : Promise.resolve();
  return (
    <div className={`manage-mail-shell${current ? " has-thread" : ""}`}>
      <aside className="manage-mail-folders">
        <button
          className="manage-compose"
          disabled={!activeMailboxes.some((mailbox) => mailbox.canSend)}
          onClick={() =>
            onCompose({
              mode: "new",
              mailboxId: data.mail.selectedMailboxId || undefined,
            })
          }
        >
          <PenLine size={17} /> Compose
        </button>
        <label className="manage-mailbox-switch">
          <span>Mailbox</span>
          <CostivraSelect
            aria-label="Current mailbox"
            value={data.mail.selectedMailboxId || ""}
            onChange={(val) =>
              router.push(
                `/manage/mail?folder=${data.mail.folder}&mailbox=${val}`,
              )
            }
            size="sm"
            options={
              !activeMailboxes.length
                ? [{ value: "", label: "No active mailbox" }]
                : activeMailboxes.map((mailbox) => ({
                    value: mailbox.id,
                    label: mailbox.address,
                  }))
            }
          />
        </label>
        <nav>
          {folders.map(([key, label, Icon]) => (
            <Link
              className={data.mail.folder === key ? "active" : ""}
              href={`/manage/mail?folder=${key}${mailboxQuery}`}
              key={key}
            >
              <Icon size={17} />
              <span>{label}</span>
              {key === "inbox" && data.mail.unreadCount > 0 && (
                <b>{data.mail.unreadCount}</b>
              )}
            </Link>
          ))}
        </nav>
        <div
          className={`manage-mail-setup${data.mail.inboundReady ? " ready" : ""}`}
        >
          <i />{" "}
          <div>
            <strong>
              {data.mail.inboundReady
                ? "Inbound configured"
                : "Inbound needs setup"}
            </strong>
            <span>{data.mail.inboxAddress}</span>
          </div>
        </div>
      </aside>
      <section className="manage-mail-list">
        <header>
          <div>
            <h2>{pretty(data.mail.folder)}</h2>
            <span>
              {threads.length} conversation{threads.length === 1 ? "" : "s"}
            </span>
          </div>
          <CostivraSelect
            className="manage-mailbox-mobile-switch"
            aria-label="Current mailbox"
            value={data.mail.selectedMailboxId || ""}
            onChange={(val) =>
              router.push(
                `/manage/mail?folder=${data.mail.folder}&mailbox=${val}`,
              )
            }
            size="sm"
            variant="compact"
            options={
              !activeMailboxes.length
                ? [{ value: "", label: "No active mailbox" }]
                : activeMailboxes.map((mailbox) => ({
                    value: mailbox.id,
                    label: mailbox.address,
                  }))
            }
          />
          <button aria-label="Refresh" onClick={() => router.refresh()}>
            <RefreshCw size={16} />
          </button>
        </header>
        <div>
          {threads.map((thread) => (
            <MailThreadRow
              thread={thread}
              active={current?.id === thread.id}
              folder={data.mail.folder}
              key={thread.id}
            />
          ))}
          {!threads.length && (
            <Empty
              icon={MailOpen}
              title={`No ${data.mail.folder}`}
              copy="This mailbox uses only Resend events and emails you send from Costivra. Nothing is filled with demo messages."
            />
          )}
        </div>
      </section>
      <section className="manage-mail-reader">
        {current ? (
          <>
            <header className="manage-reader-tools">
              <div>
                <Link
                  href={`/manage/mail?folder=${data.mail.folder}${mailboxQuery}`}
                  aria-label="Back to message list"
                >
                  <ArrowLeft size={17} />
                </Link>
                <button
                  onClick={() => void act("archive")}
                  aria-label="Archive"
                >
                  <Archive size={17} />
                </button>
                <button
                  onClick={() => void act("trash")}
                  aria-label="Move to trash"
                >
                  <Trash2 size={17} />
                </button>
                <button
                  onClick={() =>
                    void act(current.unreadCount ? "read" : "unread")
                  }
                  aria-label="Change read state"
                >
                  {current.unreadCount ? (
                    <MailOpen size={17} />
                  ) : (
                    <Mail size={17} />
                  )}
                </button>
              </div>
              <button
                onClick={() => void act(current.isStarred ? "unstar" : "star")}
                aria-label="Star conversation"
              >
                <Star
                  size={18}
                  fill={current.isStarred ? "currentColor" : "none"}
                />
              </button>
            </header>
            <div className="manage-reader-heading">
              <div>
                <span className="manage-person-avatar">
                  {initials(
                    current.contactName || current.participants[0] || "?",
                  )}
                </span>
                <div>
                  <h2>{current.subject}</h2>
                  <p>
                    {current.contactName ||
                      current.participants[0] ||
                      "Unknown sender"}
                    {current.organizationName && (
                      <>
                        {" "}
                        · <strong>{current.organizationName}</strong>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <Status value={current.latestStatus} />
            </div>
            <div className="manage-message-stack">
              {data.mail.messages.map((message) => (
                <article className="manage-message" key={message.id}>
                  <header>
                    <div>
                      <strong>
                        {message.direction === "outbound"
                          ? data.operator.fullName
                          : current.contactName || message.fromAddress}
                      </strong>
                      <span>
                        {message.fromAddress} → {message.toAddresses.join(", ")}
                      </span>
                    </div>
                    <time>
                      {date(
                        message.sentAt ||
                          message.receivedAt ||
                          message.createdAt,
                        true,
                      )}
                    </time>
                  </header>
                  <pre>
                    {message.textBody || "No plain-text body was available."}
                  </pre>
                  {message.attachments.length > 0 && (
                    <div className="manage-attachments">
                      {message.attachments.map((attachment) => (
                        <span key={attachment.filename}>
                          <Paperclip size={14} /> {attachment.filename}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <footer className="manage-reader-reply">
              <button
                className="manage-button manage-button--quiet"
                onClick={() => {
                  const latest = data.mail.messages.at(-1);
                  onCompose({
                    mode: "reply",
                    organizationId: current.organizationId || undefined,
                    to:
                      current.contactEmail ||
                      (latest?.direction === "inbound"
                        ? latest.fromAddress
                        : latest?.toAddresses[0]),
                    subject: current.subject.toLowerCase().startsWith("re:")
                      ? current.subject
                      : `Re: ${current.subject}`,
                    threadId: current.id,
                    mailboxId: current.mailboxId || undefined,
                  });
                }}
              >
                <Reply size={16} /> Reply
              </button>
              <button
                className="manage-button manage-button--quiet"
                onClick={() => {
                  const latest = data.mail.messages.at(-1);
                  onCompose({
                    mode: "forward",
                    organizationId: current.organizationId || undefined,
                    subject: current.subject.toLowerCase().startsWith("fwd:")
                      ? current.subject
                      : `Fwd: ${current.subject}`,
                    body: latest
                      ? `\n\n---------- Forwarded message ----------\nFrom: ${latest.fromAddress}\nDate: ${date(latest.sentAt || latest.receivedAt || latest.createdAt, true)}\nSubject: ${latest.subject}\n\n${latest.textBody || ""}`
                      : "",
                    mailboxId: current.mailboxId || undefined,
                  });
                }}
              >
                <Send size={16} /> Forward
              </button>
            </footer>
          </>
        ) : (
          <Empty
            icon={MailOpen}
            title="Choose a conversation"
            copy="Select a real inbound or outbound thread to read it here."
          />
        )}
      </section>
      <aside className="manage-mail-contact">
        {current ? (
          <>
            <div className="manage-mail-contact-head">
              <span className="manage-person-avatar large">
                {initials(
                  current.contactName || current.organizationName || "?",
                )}
              </span>
              <h3>{current.contactName || "Unlinked sender"}</h3>
              <p>{current.contactEmail || current.participants[0]}</p>
              {current.organizationName ? (
                <Status value="active" />
              ) : (
                <span className="manage-warning">
                  <CircleAlert size={14} /> Link before replying
                </span>
              )}
            </div>
            <dl>
              <div>
                <dt>Account</dt>
                <dd>{current.organizationName || "Not linked"}</dd>
              </div>
              <div>
                <dt>Last message</dt>
                <dd>{date(current.lastMessageAt, true)}</dd>
              </div>
              <div>
                <dt>Thread status</dt>
                <dd>{pretty(current.status)}</dd>
              </div>
            </dl>
            {current.organizationId && (
              <Link
                className="manage-button manage-button--quiet manage-full"
                href={`/manage/accounts?account=${current.organizationId}`}
              >
                View account
              </Link>
            )}
          </>
        ) : (
          <p className="manage-contact-placeholder">
            Client context appears here when you open a conversation.
          </p>
        )}
      </aside>
    </div>
  );
}

function MailThreadRow({
  thread,
  active,
  folder,
}: {
  thread: ManageMailThread;
  active: boolean;
  folder: string;
}) {
  return (
    <Link
      href={`/manage/mail/${thread.id}?folder=${folder}${thread.mailboxId ? `&mailbox=${thread.mailboxId}` : ""}`}
      className={`manage-thread${active ? " active" : ""}${thread.unreadCount ? " unread" : ""}`}
    >
      <span className="manage-thread-star" aria-hidden="true">
        <Star size={15} fill={thread.isStarred ? "currentColor" : "none"} />
      </span>
      <span className="manage-person-avatar">
        {initials(
          thread.contactName ||
            thread.organizationName ||
            thread.participants[0] ||
            "?",
        )}
      </span>
      <div>
        <header>
          <strong>
            {thread.contactName ||
              thread.organizationName ||
              thread.participants[0] ||
              "Unknown sender"}
          </strong>
          <time>{date(thread.lastMessageAt)}</time>
        </header>
        <h3>{thread.subject}</h3>
        <p>{thread.snippet || "No message preview"}</p>
        <footer>
          {thread.organizationName && <span>{thread.organizationName}</span>}
          {thread.latestStatus && <small>{pretty(thread.latestStatus)}</small>}
        </footer>
      </div>
    </Link>
  );
}

function ActivityPage({
  data,
  query,
  onNote,
}: {
  data: ManageData;
  query: string;
  onNote: () => void;
}) {
  const rows = data.activities.filter((item) =>
    `${item.subject} ${item.summary} ${item.organizationName}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <section className="manage-page-heading">
        <div>
          <h2>Activity</h2>
          <p>An internal timeline of client touches and CRM changes.</p>
        </div>
        <button
          className="manage-button manage-button--primary"
          onClick={onNote}
        >
          <Plus size={16} /> Add note
        </button>
      </section>
      <section className="manage-panel manage-activity-page">
        <ActivityList activities={rows} />
        {!rows.length && (
          <Empty
            icon={Activity}
            title="No matching activity"
            copy={
              data.activities.length
                ? "Clear the search to see the complete live history."
                : "Notes, tasks, and mail events will build the audit-friendly timeline."
            }
          />
        )}
      </section>
    </>
  );
}

function TaskList({ tasks }: { tasks: ManageData["tasks"] }) {
  return (
    <div className="manage-compact-list">
      {tasks.map((task) => (
        <article key={task.id}>
          <span
            className={`manage-task-icon manage-task-icon--${task.priority}`}
          >
            <CalendarClock size={16} />
          </span>
          <div>
            <strong>{task.title}</strong>
            <p>{task.organizationName}</p>
          </div>
          <time>{date(task.dueAt)}</time>
        </article>
      ))}
    </div>
  );
}
function ActivityList({
  activities,
}: {
  activities: ManageData["activities"];
}) {
  return (
    <div className="manage-activity-list">
      {activities.map((item) => (
        <article key={item.id}>
          <span>
            <Activity size={15} />
          </span>
          <div>
            <strong>{item.subject}</strong>
            <p>{item.summary || pretty(item.kind)}</p>
            <small>{item.organizationName}</small>
          </div>
          <time>{date(item.occurredAt, true)}</time>
        </article>
      ))}
    </div>
  );
}

function AccountForm({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Add a real account"
      copy="This creates a live Supabase organization. It does not create a customer login or send an invitation."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label>
            <span>Account name *</span>
            <input name="name" required autoFocus />
          </label>
          <label>
            <span>Legal name</span>
            <input name="legalName" />
          </label>
          <label>
            <span>Industry</span>
            <input name="industry" />
          </label>
          <label>
            <span>Lifecycle stage</span>
            <CostivraSelect
              name="stage"
              defaultValue="lead"
              options={stages.map((stage) => ({
                value: stage,
                label: pretty(stage),
              }))}
            />
          </label>
          <label>
            <span>Primary contact</span>
            <input name="contactName" />
          </label>
          <label>
            <span>Contact email</span>
            <input name="contactEmail" type="email" />
          </label>
        </div>
        <p className="manage-form-note">
          <CircleAlert size={15} /> Adding an account stores a real CRM record.
          Customer access is invited separately.
        </p>
        <FormActions busy={busy} submit="Add account" onClose={onClose} />
      </form>
    </Modal>
  );
}
function ContactForm({
  data,
  busy,
  onClose,
  onSubmit,
}: {
  data: ManageData;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Add client contact"
      copy="Use a real business contact. No invitation or email is sent."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label className="wide">
            <span>Account *</span>
            <CostivraSelect
              name="organizationId"
              required
              autoFocus
              placeholder="Choose an account"
              options={[
                { value: "", label: "Choose an account" },
                ...data.accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
              ]}
            />
          </label>
          <label>
            <span>Full name *</span>
            <input name="fullName" required />
          </label>
          <label>
            <span>Work email *</span>
            <input name="email" type="email" required />
          </label>
          <label>
            <span>Title</span>
            <input name="title" />
          </label>
          <label>
            <span>Phone</span>
            <input name="phone" type="tel" />
          </label>
          <label className="manage-check wide">
            <input name="isPrimary" type="checkbox" value="true" />
            <span>Primary contact for this account</span>
          </label>
        </div>
        <FormActions busy={busy} submit="Add contact" onClose={onClose} />
      </form>
    </Modal>
  );
}
function TaskForm({
  data,
  busy,
  onClose,
  onSubmit,
}: {
  data: ManageData;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Create follow-up"
      copy="Tasks stay internal until you deliberately call, meet, or send an email."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label className="wide">
            <span>Account *</span>
            <CostivraSelect
              name="organizationId"
              required
              autoFocus
              placeholder="Choose an account"
              options={[
                { value: "", label: "Choose an account" },
                ...data.accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
              ]}
            />
          </label>
          <label className="wide">
            <span>Task *</span>
            <input name="title" required />
          </label>
          <label>
            <span>Type</span>
            <CostivraSelect
              name="taskType"
              defaultValue="follow_up"
              options={[
                { value: "follow_up", label: "Follow-up" },
                { value: "email", label: "Email" },
                { value: "call", label: "Call" },
                { value: "meeting", label: "Meeting" },
                { value: "review", label: "Review" },
              ]}
            />
          </label>
          <label>
            <span>Priority</span>
            <CostivraSelect
              name="priority"
              defaultValue="normal"
              options={[
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
              ]}
            />
          </label>
          <label>
            <span>Due</span>
            <CostivraDateTimePicker name="dueAt" />
          </label>
          <label className="wide">
            <span>Notes</span>
            <textarea name="notes" rows={4} />
          </label>
        </div>
        <FormActions busy={busy} submit="Create task" onClose={onClose} />
      </form>
    </Modal>
  );
}
function NoteForm({
  data,
  busy,
  onClose,
  onSubmit,
}: {
  data: ManageData;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Add internal note"
      copy="Notes are owner-only CRM history. They are never shown in the customer portal."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label className="wide">
            <span>Account *</span>
            <CostivraSelect
              name="organizationId"
              required
              autoFocus
              placeholder="Choose an account"
              options={[
                { value: "", label: "Choose an account" },
                ...data.accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
              ]}
            />
          </label>
          <label className="wide">
            <span>Title *</span>
            <input name="subject" required />
          </label>
          <label className="wide">
            <span>Note</span>
            <textarea name="summary" rows={7} />
          </label>
        </div>
        <FormActions busy={busy} submit="Save note" onClose={onClose} />
      </form>
    </Modal>
  );
}

function EditAccount({
  account,
  onClose,
}: {
  account: ManageAccount;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      await api(`/api/manage/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      toast.success("Account follow-up updated.");
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(
        "That didn’t work",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Update ${account.name}`}
      copy="These fields are private CRM context and do not change the customer’s financial records."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="manage-form-grid">
          <label>
            <span>Lifecycle stage</span>
            <CostivraSelect
              name="stage"
              defaultValue={account.stage || "onboarding"}
              options={stages.map((stage) => ({
                value: stage,
                label: pretty(stage),
              }))}
            />
          </label>
          <label>
            <span>Next follow-up</span>
            <CostivraDateTimePicker
              name="nextFollowUpAt"
              defaultValue={account.nextFollowUpAt?.slice(0, 16) || ""}
            />
          </label>
          <label className="wide">
            <span>Next step</span>
            <input name="nextStep" defaultValue={account.nextStep || ""} />
          </label>
          <label className="wide">
            <span>Private notes</span>
            <textarea
              name="privateNotes"
              rows={6}
              defaultValue={account.privateNotes || ""}
            />
          </label>
        </div>
        <FormActions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function MailboxForm({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Create mailbox seat"
      copy="This address can send and receive inside the Costivra CRM."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label className="wide">
            <span>Display name</span>
            <input
              name="displayName"
              required
              maxLength={100}
              placeholder="Jordan Lee"
            />
          </label>
          <label className="wide">
            <span>Email address</span>
            <div className="manage-mailbox-address-field">
              <input
                name="localPart"
                required
                maxLength={64}
                pattern="[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*"
                placeholder="jordan.lee"
              />
              <strong>@costivra.ai</strong>
            </div>
          </label>
          <label className="wide">
            <span>Seat type</span>
            <CostivraSelect
              name="mailboxType"
              defaultValue="personal"
              options={[
                { value: "personal", label: "Personal mailbox" },
                { value: "shared", label: "Shared team mailbox" },
              ]}
            />
          </label>
        </div>
        <p className="manage-form-note">
          Creating a mailbox does not send an invitation. Platform access and
          login permissions remain separate.
        </p>
        <FormActions
          busy={busy}
          submit="Create mailbox"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

function Compose({
  data,
  context,
  onClose,
}: {
  data: ManageData;
  context: ComposeContext;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(
    context.organizationId || "",
  );
  const availableMailboxes = data.mail.mailboxes.filter(
    (mailbox) => mailbox.status === "active" && mailbox.canSend,
  );
  const [selectedMailbox, setSelectedMailbox] = useState(
    context.mailboxId || data.mail.selectedMailboxId || "",
  );
  const accountContacts = useMemo(
    () =>
      data.contacts.filter(
        (contact) => contact.organizationId === selectedAccount,
      ),
    [data.contacts, selectedAccount],
  );
  async function submitForm(element: HTMLFormElement, mode: "draft" | "send") {
    const form = new FormData(element);
    form.set("mode", mode);
    form.set("idempotencyKey", crypto.randomUUID());
    setBusy(true);
    try {
      const result = await api("/api/manage/mail/messages", {
        method: "POST",
        body: form,
        headers: {},
      });
      toast.success(
        mode === "draft"
          ? "Draft saved."
          : result.threadId
            ? "Email accepted by Resend."
            : "Email sent.",
      );
      onClose();
      router.push(
        result.threadId
          ? `/manage/mail/${result.threadId}?folder=${mode === "draft" ? "drafts" : "sent"}&mailbox=${selectedMailbox}`
          : `/manage/mail?mailbox=${selectedMailbox}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        mode === "draft" ? "Draft was not saved" : "Email was not sent",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="manage-compose-window">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitForm(event.currentTarget, "send");
        }}
      >
        {context.threadId && (
          <input type="hidden" name="threadId" value={context.threadId} />
        )}
        <header>
          <div>
            <strong>
              {context.mode === "reply"
                ? "Reply"
                : context.mode === "forward"
                  ? "Forward message"
                  : "New message"}
            </strong>
            <span>via Resend</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close composer">
            <X size={17} />
          </button>
        </header>
        <div className="manage-compose-account">
          <div className="manage-compose-routing">
            <label>
              <span>From *</span>
              <CostivraSelect
                name="mailboxId"
                required
                value={selectedMailbox}
                onChange={(val) => setSelectedMailbox(val)}
                placeholder="Choose mailbox"
                size="sm"
                options={[
                  { value: "", label: "Choose mailbox" },
                  ...availableMailboxes.map((mailbox) => ({
                    value: mailbox.id,
                    label: `${mailbox.displayName} · ${mailbox.address}`,
                  })),
                ]}
              />
            </label>
            <label>
              <span>Client account *</span>
              <CostivraSelect
                name="organizationId"
                required
                value={selectedAccount}
                onChange={(val) => setSelectedAccount(val)}
                placeholder="Link this email to an account"
                size="sm"
                options={[
                  { value: "", label: "Link this email to an account" },
                  ...data.accounts.map((account) => ({
                    value: account.id,
                    label: account.name,
                  })),
                ]}
              />
            </label>
          </div>
          <small>Required so the send is authorized and auditable.</small>
        </div>
        <div className="manage-compose-line">
          <span>To</span>
          <input
            name="to"
            type="email"
            list="manage-contact-emails"
            required
            placeholder="recipient@company.com"
            defaultValue={context.to || ""}
          />
          <button type="button" onClick={() => setShowCc((value) => !value)}>
            Cc/Bcc
          </button>
          <datalist id="manage-contact-emails">
            {accountContacts.map((contact) => (
              <option value={contact.email} key={contact.id}>
                {contact.fullName}
              </option>
            ))}
          </datalist>
        </div>
        {showCc && (
          <>
            <div className="manage-compose-line">
              <span>Cc</span>
              <input name="cc" placeholder="Separate addresses with commas" />
            </div>
            <div className="manage-compose-line">
              <span>Bcc</span>
              <input name="bcc" placeholder="Separate addresses with commas" />
            </div>
          </>
        )}
        <div className="manage-compose-line">
          <input
            className="subject"
            name="subject"
            placeholder="Subject"
            required
            defaultValue={context.subject || ""}
          />
        </div>
        <textarea
          name="body"
          aria-label="Message body"
          placeholder="Write your message…"
          required
          defaultValue={context.body || ""}
        />
        <div className="manage-compose-schedule">
          <label>
            <Clock3 size={14} />
            <span>Schedule (optional)</span>
            <CostivraDateTimePicker name="scheduledAt" />
          </label>
        </div>
        <footer>
          <div>
            <label className="manage-attach" title="Attach up to five files">
              <Paperclip size={18} />
              <input name="attachments" type="file" multiple />
            </label>
            <button
              className="manage-button manage-button--quiet"
              type="button"
              disabled={busy || !selectedAccount || !selectedMailbox}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) void submitForm(form, "draft");
              }}
            >
              Save draft
            </button>
          </div>
          <button
            className="manage-button manage-button--primary"
            disabled={busy || !selectedAccount || !selectedMailbox}
          >
            {busy ? "Sending…" : "Send"}
            <Send size={16} />
          </button>
        </footer>
      </form>
    </div>
  );
}
