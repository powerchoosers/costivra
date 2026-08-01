"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Info,
  Link2,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Pause,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { PortalData } from "@/lib/portal/types";
import { useToast } from "@/components/toast-provider";
import { CostivraSelect, SelectOption } from "@/components/ui/costivra-select";
import { CostivraDatePicker } from "@/components/ui/costivra-date-picker";
import { formatMoneyInput } from "@/lib/vendors/spend";

type ApiOptions = {
  method?: string;
  body?: BodyInit | Record<string, unknown>;
};
type ModalState = null | "expense" | "contract" | "invite" | "upload";

async function api(url: string, options: ApiOptions = {}) {
  const body =
    options.body && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body;
  const response = await fetch(url, {
    method: options.method ?? (body ? "POST" : "GET"),
    body: body as BodyInit | undefined,
    headers:
      body && !(body instanceof FormData)
        ? { "content-type": "application/json" }
        : undefined,
  });
  const payload = response.headers.get("content-type")?.includes("json")
    ? await response.json()
    : null;
  if (!response.ok)
    throw new Error(payload?.error ?? "The request could not be completed.");
  return payload;
}

const money = (value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(value);
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Not set";
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="portal-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="portal-empty">
      <FileText size={24} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span className={`portal-status status-${value}`}>{titleCase(value)}</span>
  );
}

function PortalModal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    let closeTimer: number | undefined;
    const stateTimer = window.setTimeout(() => {
      if (open) {
        setMounted(true);
        setLeaving(false);
      } else if (mounted) {
        setLeaving(true);
        closeTimer = window.setTimeout(() => {
          setMounted(false);
          setLeaving(false);
        }, 190);
      }
    }, 0);
    return () => {
      window.clearTimeout(stateTimer);
      if (closeTimer) window.clearTimeout(closeTimer);
    };
  }, [open, mounted]);
  useEffect(() => {
    if (!mounted) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const bodyWasLocked = document.body.classList.contains("modal-open");
    document.body.classList.add("modal-open");
    const focusTimer = window.requestAnimationFrame(() => {
      const initial = dialogRef.current?.querySelector<HTMLElement>(
        ".portal-modal-body input:not([type='hidden']), .portal-modal-body select, .portal-modal-body textarea, .portal-modal-body button, .portal-modal-body [href]",
      );
      (initial ?? dialogRef.current)?.focus();
    });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", key);
      if (!bodyWasLocked) document.body.classList.remove("modal-open");
      previousFocusRef.current?.focus();
    };
  }, [mounted]);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`portal-modal-layer${leaving ? " is-leaving" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <section
        ref={dialogRef}
        className="portal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => closeRef.current()}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </header>
        <div className="portal-modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

function FormActions({
  busy,
  onCancel,
  label = "Save",
}: {
  busy: boolean;
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="portal-form-actions">
      <button type="button" className="button button-quiet" onClick={onCancel}>
        Cancel
      </button>
      <button className="button button-primary" disabled={busy}>
        {busy && <LoaderCircle className="spin" size={16} />}{" "}
        {busy ? "Working…" : label}
      </button>
    </div>
  );
}

export function PortalPage({
  slug,
  data,
}: {
  slug?: string[];
  data: PortalData;
}) {
  const page = slug?.[0] ?? "home";
  const [modal, setModal] = useState<ModalState>(null);
  const [presetVendor, setPresetVendor] = useState<string>();
  const [vendorPanelOpen, setVendorPanelOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();
  useEffect(() => {
    setVendorPanelOpen(
      sessionStorage.getItem("costivra.vendor-panel.open") === "true",
    );
  }, []);
  const openVendorPanel = () => {
    sessionStorage.setItem("costivra.vendor-panel.open", "true");
    setVendorPanelOpen(true);
  };
  const closeVendorPanel = () => {
    sessionStorage.removeItem("costivra.vendor-panel.open");
    sessionStorage.removeItem("costivra.vendor-panel.draft");
    setVendorPanelOpen(false);
  };
  const openRelated = (
    kind: Exclude<ModalState, null>,
    relationshipId: string,
  ) => {
    setPresetVendor(relationshipId);
    setModal(kind);
  };
  const run = async (
    work: () => Promise<unknown>,
    success: string,
  ): Promise<void> => {
    try {
      await work();
      router.refresh();
      toast.success(success);
    } catch (error) {
      toast.error(
        "That didn’t work",
        error instanceof Error ? error.message : "Please try again.",
      );
      throw error;
    }
  };
  const pages: Record<string, ReactNode> = {
    home: <CommandCenter data={data} />,
    expenses: <Expenses data={data} onAdd={() => setModal("expense")} />,
    opportunities: <Opportunities data={data} run={run} />,
    contracts: <Contracts data={data} onAdd={() => setModal("contract")} />,
    documents: (
      <Documents data={data} onUpload={() => setModal("upload")} run={run} />
    ),
    actions: <Actions data={data} run={run} />,
    savings: <Savings data={data} />,
    vendors: slug?.[1] ? (
      <VendorDetail data={data} vendorId={slug[1]} onAdd={openRelated} />
    ) : (
      <Vendors data={data} onAdd={openVendorPanel} />
    ),
    integrations: <Integrations data={data} run={run} />,
    reports: <Reports data={data} />,
    team: <Team data={data} onInvite={() => setModal("invite")} />,
    ask: <Ask data={data} />,
    settings: <Settings data={data} run={run} />,
  };
  return (
    <>
      <div
        key={slug?.join("/") ?? page}
        className={
          page === "ask"
            ? "app-content app-content-chat motion-page"
            : "app-content motion-page"
        }
      >
        {pages[page] ?? (
          <Empty
            title="Page not found"
            copy="Use the workspace navigation to continue."
          />
        )}
      </div>
      <CreateModals
        kind={modal}
        setKind={setModal}
        data={data}
        run={run}
        presetVendor={presetVendor}
      />
      <VendorSidePanel
        open={vendorPanelOpen}
        onClose={closeVendorPanel}
        data={data}
      />
    </>
  );
}

function CommandCenter({ data }: { data: PortalData }) {
  const verified = data.savings
    .filter((item) => item.status === "verified")
    .reduce((sum, item) => sum + item.amount, 0);
  const potential = data.opportunities
    .filter((item) => !["declined", "closed", "verified"].includes(item.status))
    .reduce((sum, item) => sum + (item.estimatedAnnualValue ?? 0), 0);
  const spend = data.vendors.reduce(
    (sum, item) => sum + item.annualizedSpend,
    0,
  );
  const due = data.actions.filter(
    (item) => !["complete", "cancelled"].includes(item.status),
  ).length;
  return (
    <>
      <PageHeader
        title="Command Center"
        description={`A live operating view of ${data.organization.name}'s recurring costs.`}
      />
      <div className="portal-metrics">
        <Metric
          label="Verified value"
          value={money(verified, true)}
          note={`${data.savings.filter((x) => x.status === "verified").length} proven outcomes`}
          icon={<CheckCircle2 />}
        />
        <Metric
          label="Potential value"
          value={money(potential, true)}
          note={`${data.opportunities.length} active findings`}
          icon={<CircleDollarSign />}
        />
        <Metric
          label="Monitored spend"
          value={money(spend, true)}
          note={`${data.vendors.length} vendor relationships`}
          icon={<ReceiptText />}
        />
        <Metric
          label="Actions due"
          value={String(due)}
          note="Decisions needing attention"
          icon={<CalendarClock />}
        />
      </div>
      <section className="portal-panel">
        <div className="portal-panel-heading">
          <div>
            <h2>Priority work</h2>
            <p>Highest-value findings that still require a decision.</p>
          </div>
        </div>
        {data.opportunities.length ? (
          <div className="portal-list">
            {data.opportunities.slice(0, 5).map((item) => (
              <a
                href={`/app/opportunities#${item.id}`}
                className="portal-list-row"
                key={item.id}
              >
                <span className={`priority-dot priority-${item.priority}`} />
                <div className="grow">
                  <strong>{item.title}</strong>
                  <span>
                    {item.vendorName} · {item.evidenceCount} evidence reference
                    {item.evidenceCount === 1 ? "" : "s"}
                  </span>
                </div>
                <strong className="money-value">
                  {money(item.estimatedAnnualValue ?? 0, true)}
                </strong>
                <Status value={item.status} />
              </a>
            ))}
          </div>
        ) : (
          <Empty
            title="No opportunities yet"
            copy="Upload current bills or contracts to begin detection."
          />
        )}
      </section>
    </>
  );
}
function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <article className="portal-metric">
      <span className="portal-metric-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Expenses({ data, onAdd }: { data: PortalData; onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = data.expenses.filter((x) =>
    `${x.vendorName} ${x.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Expenses"
        description="Normalized recurring charges from your connected source records."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} /> Add expense
          </button>
        }
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search vendor or category"
      />
      <section className="portal-panel">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const change = item.priorPeriodAmount
                    ? ((item.amount - item.priorPeriodAmount) /
                        item.priorPeriodAmount) *
                      100
                    : null;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.vendorName}</strong>
                      </td>
                      <td>{item.category}</td>
                      <td>{date(item.periodEnd)}</td>
                      <td>{money(item.amount)}</td>
                      <td>
                        {change == null ? (
                          "—"
                        ) : (
                          <span
                            className={change > 0 ? "change-up" : "change-down"}
                          >
                            {change > 0 ? <ArrowUpRight /> : <ArrowDownRight />}
                            {Math.abs(change).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td>
                        <Status value={item.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No expenses match"
            copy="Clear the search or add the first expense record."
          />
        )}
      </section>
    </>
  );
}
function Opportunities({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const filtered = data.opportunities.filter((x) =>
    `${x.title} ${x.vendorName} ${x.summary}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const update = (id: string, status: string) =>
    run(
      () =>
        api(`/api/portal/opportunities/${id}`, {
          method: "PATCH",
          body: { status },
        }),
      "Opportunity updated.",
    );
  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Evidence-backed findings, prioritized for deliberate review."
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search findings or vendors"
      />
      <div className="portal-card-grid">
        {filtered.map((item) => (
          <article className="portal-card" id={item.id} key={item.id}>
            <header>
              <Status value={item.priority} />
              <span>
                {Math.round((item.confidence ?? 0) * 100)}% confidence
              </span>
            </header>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <dl>
              <div>
                <dt>Vendor</dt>
                <dd>{item.vendorName}</dd>
              </div>
              <div>
                <dt>Annual value</dt>
                <dd>{money(item.estimatedAnnualValue ?? 0)}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{item.evidenceCount} references</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{date(item.deadlineAt)}</dd>
              </div>
            </dl>
            <footer>
              <Status value={item.status} />
              <CostivraSelect
                aria-label={`Update ${item.title} status`}
                value={item.status}
                variant="badge"
                size="sm"
                onChange={(newStatus) => void update(item.id, newStatus)}
                options={[
                  { value: "open", label: "Open" },
                  { value: "under_review", label: "Under review" },
                  { value: "approved", label: "Approved" },
                  { value: "declined", label: "Declined" },
                  { value: "in_progress", label: "In progress" },
                  { value: "closed", label: "Closed" },
                ]}
              />
            </footer>
          </article>
        ))}
        {!filtered.length && (
          <Empty
            title="No opportunities match"
            copy="Try a broader search or upload new source documents."
          />
        )}
      </div>
    </>
  );
}
function Contracts({ data, onAdd }: { data: PortalData; onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const rows = data.contracts.filter((x) =>
    `${x.title} ${x.vendorName} ${x.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Contracts"
        description="Renewal, notice, value, and ownership in one reliable record."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} /> Add contract
          </button>
        }
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search contracts"
      />
      <section className="portal-panel">
        {rows.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Vendor</th>
                  <th>Annual value</th>
                  <th>End date</th>
                  <th>Notice</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <small>{item.category}</small>
                    </td>
                    <td>{item.vendorName}</td>
                    <td>
                      {item.annualValue == null ? "—" : money(item.annualValue)}
                    </td>
                    <td>{date(item.endDate)}</td>
                    <td>
                      {item.noticePeriodDays == null
                        ? "—"
                        : `${item.noticePeriodDays} days`}
                    </td>
                    <td>
                      <Status value={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No contracts match"
            copy="Add a contract or clear your search."
          />
        )}
      </section>
    </>
  );
}

function Documents({
  data,
  onUpload,
  run,
}: {
  data: PortalData;
  onUpload: () => void;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const rows = data.documents.filter((x) =>
    `${x.originalFilename} ${x.vendorName} ${x.summary ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const invoiceByDocument = new Map(
    data.invoices.map((invoice) => [invoice.documentId, invoice]),
  );
  const remove = (id: string) => {
    if (confirm("Delete this document and its extracted evidence?"))
      void run(
        () => api(`/api/portal/documents/${id}`, { method: "DELETE" }),
        "Document deleted.",
      );
  };
  return (
    <>
      <PageHeader
        title="Documents"
        description="Private source files with extraction status and traceable evidence."
        action={
          <button className="button button-primary" onClick={onUpload}>
            <Upload size={16} /> Upload documents
          </button>
        }
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search files, vendors, or summaries"
      />
      <section className="portal-panel">
        {rows.length ? (
          <div className="portal-document-grid">
            {rows.map((item) => (
              <article className="document-card" key={item.id}>
                <div className="document-icon">
                  <FileText />
                </div>
                <div className="grow">
                  <h3>{item.originalFilename}</h3>
                  <p>
                    {item.summary || "No extraction summary is available yet."}
                  </p>
                  <span>
                    {item.vendorName} · {(item.byteSize / 1024).toFixed(1)} KB ·{" "}
                    {date(item.createdAt)}
                  </span>
                  {invoiceByDocument.get(item.id) && (() => {
                    const invoice = invoiceByDocument.get(item.id)!;
                    return (
                      <div className="document-invoice-facts" aria-label="Extracted invoice record">
                        <span><strong>{invoice.invoiceNumber ?? "Number missing"}</strong>Invoice</span>
                        <span><strong>{invoice.totalAmount == null ? "Amount missing" : new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency ?? "USD" }).format(invoice.totalAmount)}</strong>Total</span>
                        <span><strong>{invoice.lineItemCount}</strong>Line items</span>
                        <Status value={invoice.reconciliationStatus} />
                        <Status value={invoice.reviewStatus} />
                      </div>
                    );
                  })()}
                </div>
                <div className="document-actions">
                  <Status value={item.status} />
                  <a
                    className="icon-button"
                    href={`/api/portal/documents/${item.id}/download`}
                    aria-label={`Download ${item.originalFilename}`}
                  >
                    <Download size={17} />
                  </a>
                  <button
                    className="icon-button danger"
                    onClick={() => remove(item.id)}
                    aria-label={`Delete ${item.originalFilename}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="No documents match"
            copy="Upload a PDF, DOCX, or text file to begin extraction."
          />
        )}
      </section>
    </>
  );
}

function Actions({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const execute = (id: string, operation: string) =>
    run(
      () =>
        api(`/api/portal/actions/${id}`, {
          method: "PATCH",
          body: { operation },
        }),
      `Action ${operation === "complete" ? "completed" : `${operation}d`}.`,
    );
  return (
    <>
      <PageHeader
        title="Actions"
        description="Approval and execution steps remain explicit, attributable, and reversible where possible."
      />
      <div className="portal-card-grid">
        {data.actions.map((item) => (
          <article className="portal-card action-card" key={item.id}>
            <header>
              <Status value={item.priority} />
              <Status value={item.status} />
            </header>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <dl>
              <div>
                <dt>Vendor</dt>
                <dd>{item.vendorName}</dd>
              </div>
              <div>
                <dt>Due</dt>
                <dd>{date(item.dueAt)}</dd>
              </div>
            </dl>
            <footer className="action-buttons">
              {item.status === "pending_approval" && (
                <>
                  <button
                    className="button button-quiet"
                    onClick={() => void execute(item.id, "decline")}
                  >
                    Decline
                  </button>
                  <button
                    className="button button-primary"
                    onClick={() => void execute(item.id, "approve")}
                  >
                    <Check size={16} /> Approve
                  </button>
                </>
              )}
              {item.status === "approved" && (
                <button
                  className="button button-primary"
                  onClick={() => void execute(item.id, "start")}
                >
                  Start work
                </button>
              )}
              {item.status === "in_progress" && (
                <button
                  className="button button-primary"
                  onClick={() => void execute(item.id, "complete")}
                >
                  <Check size={16} /> Mark complete
                </button>
              )}
            </footer>
          </article>
        ))}
        {!data.actions.length && (
          <Empty
            title="No actions pending"
            copy="Approved opportunities will appear here as executable work."
          />
        )}
      </div>
    </>
  );
}

function Savings({ data }: { data: PortalData }) {
  const total = data.savings.reduce((s, x) => s + x.amount, 0);
  const verified = data.savings
    .filter((x) => x.status === "verified")
    .reduce((s, x) => s + x.amount, 0);
  return (
    <>
      <PageHeader
        title="Savings"
        description="Only supported outcomes move from potential value to verified value."
      />
      <div className="portal-metrics">
        <Metric
          label="Recorded value"
          value={money(total, true)}
          note={`${data.savings.length} outcomes`}
          icon={<CircleDollarSign />}
        />
        <Metric
          label="Verified value"
          value={money(verified, true)}
          note="Supported by later source evidence"
          icon={<ShieldCheck />}
        />
      </div>
      <section className="portal-panel">
        {data.savings.length ? (
          <div className="portal-list">
            {data.savings.map((item) => (
              <div className="portal-list-row" key={item.id}>
                <CheckCircle2 />
                <div className="grow">
                  <strong>{item.title}</strong>
                  <span>{item.method}</span>
                </div>
                <strong className="money-value">{money(item.amount)}</strong>
                <Status value={item.status} />
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No savings recorded"
            copy="Verified outcomes will appear after supporting evidence is reviewed."
          />
        )}
      </section>
    </>
  );
}

function Vendors({ data, onAdd }: { data: PortalData; onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const canAddVendor = ["owner", "admin", "member"].includes(data.currentUser.role);
  const rows = data.vendors.filter((x) =>
    `${x.name} ${x.category} ${x.website ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Vendors"
        description="Every supplier relationship, its source records, and the next important date."
        action={canAddVendor ? (
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} /> Add vendor
          </button>
        ) : undefined}
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search vendors, categories, or websites"
      />
      <section className="portal-panel vendor-directory">
        {rows.length ? (
          <div className="table-wrap">
            <table className="portal-table vendor-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Annualized spend</th>
                  <th>Records</th>
                  <th>Next contract end</th>
                  <th>Relationship</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const contracts = data.contracts
                    .filter(
                      (contract) =>
                        contract.vendorId === item.id && contract.endDate,
                    )
                    .sort((a, b) =>
                      String(a.endDate).localeCompare(String(b.endDate)),
                    );
                  const records =
                    data.expenses.filter(
                      (expense) => expense.vendorId === item.id,
                    ).length +
                    data.documents.filter(
                      (document) => document.vendorId === item.id,
                    ).length;
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link
                          className="vendor-name-cell"
                          href={`/app/vendors/${item.id}`}
                        >
                          <span className="vendor-monogram">
                            {item.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {item.website
                                ? new URL(item.website).hostname.replace(
                                    /^www\./,
                                    "",
                                  )
                                : "Website not recorded"}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>{item.category}</td>
                      <td>
                        <strong>{money(item.annualizedSpend)}</strong>
                      </td>
                      <td>{records}</td>
                      <td>{date(contracts[0]?.endDate ?? null)}</td>
                      <td>
                        <Status value={item.relationshipStatus} />
                      </td>
                      <td>
                        <Link
                          className="row-chevron"
                          href={`/app/vendors/${item.id}`}
                          aria-label={`Open ${item.name}`}
                        >
                          <ChevronRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No vendors match"
            copy="Try a broader search or add a new vendor relationship."
          />
        )}
      </section>
    </>
  );
}

function VendorDetail({
  data,
  vendorId,
  onAdd,
}: {
  data: PortalData;
  vendorId: string;
  onAdd: (kind: Exclude<ModalState, null>, relationshipId: string) => void;
}) {
  const vendor = data.vendors.find((item) => item.id === vendorId);
  if (!vendor)
    return (
      <div className="vendor-not-found">
        <Link href="/app/vendors">
          <ArrowLeft size={15} /> Back to vendors
        </Link>
        <Empty
          title="Vendor not found"
          copy="This vendor is not part of your organization, or the link is no longer valid."
        />
      </div>
    );
  const expenses = data.expenses
    .filter((item) => item.vendorId === vendorId)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  const contracts = data.contracts
    .filter((item) => item.vendorId === vendorId)
    .sort((a, b) =>
      String(a.endDate ?? "9999").localeCompare(String(b.endDate ?? "9999")),
    );
  const documents = data.documents.filter((item) => item.vendorId === vendorId);
  const opportunities = data.opportunities.filter(
    (item) => item.vendorId === vendorId,
  );
  const actions = data.actions.filter((item) => item.vendorId === vendorId);
  const contract = contracts[0];
  const latest = expenses[0];
  return (
    <div className="vendor-detail">
      <Link className="vendor-back" href="/app/vendors">
        <ArrowLeft size={15} /> Back to vendors
      </Link>
      <header className="vendor-detail-header">
        <div>
          <div className="vendor-detail-title">
            <span className="vendor-monogram large">
              {vendor.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1>{vendor.name}</h1>
              <p>
                {vendor.category}
                {vendor.website && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={vendor.website} target="_blank" rel="noreferrer">
                      {new URL(vendor.website).hostname.replace(/^www\./, "")}
                      <ExternalLink size={12} />
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
          <Status value={vendor.relationshipStatus} />
        </div>
        <div className="vendor-detail-actions">
          {vendor.website && (
            <a
              className="button button-quiet"
              href={vendor.website}
              target="_blank"
              rel="noreferrer"
            >
              <Globe2 size={16} /> Visit website
            </a>
          )}
          <button
            className="button button-primary"
            onClick={() => onAdd("expense", vendor.relationshipId)}
          >
            <Plus size={16} /> Add expense
          </button>
          <button
            className="button button-quiet"
            onClick={() => onAdd("contract", vendor.relationshipId)}
          >
            Add contract
          </button>
          <button
            className="button button-quiet"
            onClick={() => onAdd("upload", vendor.relationshipId)}
          >
            Upload document
          </button>
        </div>
      </header>
      <section className="vendor-summary-band">
        <div className="vendor-spend-stat">
          <span>Annualized spend</span>
          <strong>{money(vendor.annualizedSpend)}</strong>
          <small>Current relationship record</small>
        </div>
        <div className="vendor-spend-stat">
          <span>Latest expense</span>
          <strong>{latest ? money(latest.amount) : "Not recorded"}</strong>
          <small>
            {latest
              ? `Period ending ${date(latest.periodEnd)}`
              : "Add an expense or source document"}
          </small>
        </div>
        <SpendSparkline expenses={expenses} />
        <VendorCount label="Documents" value={documents.length} />
        <VendorCount label="Expenses" value={expenses.length} />
        <VendorCount
          label="Open findings"
          value={
            opportunities.filter(
              (item) => !["closed", "declined"].includes(item.status),
            ).length
          }
        />
        <VendorCount label="Actions" value={actions.length} />
      </section>
      <div className="vendor-detail-grid">
        <section className="portal-panel vendor-contract-summary">
          <div className="portal-panel-heading">
            <div>
              <h2>Contract summary</h2>
              <p>Dates come from saved contract records.</p>
            </div>
            <button
              className="text-button"
              onClick={() => onAdd("contract", vendor.relationshipId)}
            >
              Add contract
            </button>
          </div>
          {contract ? (
            <dl>
              <div>
                <dt>Primary contract</dt>
                <dd>{contract.title}</dd>
              </div>
              <div>
                <dt>Contract end</dt>
                <dd>{date(contract.endDate)}</dd>
              </div>
              <div>
                <dt>Notice period</dt>
                <dd>
                  {contract.noticePeriodDays == null
                    ? "Not recorded"
                    : `${contract.noticePeriodDays} days`}
                </dd>
              </div>
              <div>
                <dt>Auto-renewal</dt>
                <dd>{contract.autoRenews ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{contract.ownerName ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>Annual value</dt>
                <dd>
                  {contract.annualValue == null
                    ? "Not recorded"
                    : money(contract.annualValue)}
                </dd>
              </div>
            </dl>
          ) : (
            <Empty
              title="No contract recorded"
              copy="Add the agreement and its dates so Costivra can monitor the notice window."
            />
          )}
        </section>
        <section className="portal-panel vendor-opportunities">
          <div className="portal-panel-heading">
            <div>
              <h2>Active opportunities</h2>
              <p>Findings remain separate from verified outcomes.</p>
            </div>
          </div>
          {opportunities.length ? (
            <div className="portal-list">
              {opportunities.map((item) => (
                <Link
                  className="portal-list-row"
                  href={`/app/opportunities#${item.id}`}
                  key={item.id}
                >
                  <span className={`priority-dot priority-${item.priority}`} />
                  <div className="grow">
                    <strong>{item.title}</strong>
                    <span>
                      {item.evidenceCount} evidence reference
                      {item.evidenceCount === 1 ? "" : "s"} ·{" "}
                      {Math.round((item.confidence ?? 0) * 100)}% confidence
                    </span>
                  </div>
                  <Status value={item.status} />
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="No active findings"
              copy="Costivra has not created an evidence-backed opportunity for this vendor."
            />
          )}
        </section>
      </div>
      <div className="vendor-record-grid">
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Expenses & invoice periods</h2>
              <p>
                Normalized records only; missing invoice numbers are not
                invented.
              </p>
            </div>
            <button
              className="text-button"
              onClick={() => onAdd("expense", vendor.relationshipId)}
            >
              Add expense
            </button>
          </div>
          {expenses.length ? (
            <div className="table-wrap">
              <table className="portal-table vendor-records-table">
                <thead>
                  <tr>
                    <th>Period end</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Change</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((item) => {
                    const change = item.priorPeriodAmount
                      ? ((item.amount - item.priorPeriodAmount) /
                          item.priorPeriodAmount) *
                        100
                      : null;
                    return (
                      <tr key={item.id}>
                        <td>{date(item.periodEnd)}</td>
                        <td>{item.category}</td>
                        <td>
                          <strong>{money(item.amount)}</strong>
                        </td>
                        <td>
                          {change == null
                            ? "—"
                            : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
                        </td>
                        <td>
                          <Status value={item.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No expense history"
              copy="Add an expense or upload an invoice to begin the spend timeline."
            />
          )}
        </section>
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Recent documents</h2>
              <p>Private source files linked to this vendor.</p>
            </div>
            <button
              className="text-button"
              onClick={() => onAdd("upload", vendor.relationshipId)}
            >
              Upload
            </button>
          </div>
          {documents.length ? (
            <div className="portal-list">
              {documents.slice(0, 6).map((item) => (
                <a
                  className="portal-list-row"
                  href={`/api/portal/documents/${item.id}/download`}
                  key={item.id}
                >
                  <FileText size={17} />
                  <div className="grow">
                    <strong>{item.originalFilename}</strong>
                    <span>
                      {item.documentType ?? "Unclassified"} ·{" "}
                      {date(item.createdAt)}
                    </span>
                  </div>
                  <Status value={item.status} />
                  <Download size={15} />
                </a>
              ))}
            </div>
          ) : (
            <Empty
              title="No source documents"
              copy="Upload a bill or contract to preserve evidence for this relationship."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function VendorCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="vendor-count">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function SpendSparkline({ expenses }: { expenses: PortalData["expenses"] }) {
  const points = expenses.slice(0, 6).reverse();
  const max = Math.max(...points.map((item) => item.amount), 1);
  const path = points
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"} ${8 + index * (120 / Math.max(points.length - 1, 1))} ${48 - (item.amount / max) * 34}`,
    )
    .join(" ");
  return (
    <div className="vendor-spend-trend">
      <span>
        <TrendingUp size={15} /> Expense trend
      </span>
      {points.length > 1 ? (
        <svg
          viewBox="0 0 136 56"
          role="img"
          aria-label="Recent expense amount trend"
        >
          <path d={path} />
          {points.map((item, index) => (
            <circle
              key={item.id}
              cx={8 + index * (120 / Math.max(points.length - 1, 1))}
              cy={48 - (item.amount / max) * 34}
              r="2.5"
            />
          ))}
        </svg>
      ) : (
        <small>Two expense periods are needed for a trend.</small>
      )}
    </div>
  );
}

function Integrations({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [sender, setSender] = useState("");
  const toast = useToast();
  const intake = data.emailIntake;
  const canManage = ["owner", "admin"].includes(data.currentUser.role);
  const providerIntegrations = data.integrations.filter(
    (item) => item.provider !== "resend_inbound",
  );
  const update = (id: string, operation: string) =>
    run(
      () =>
        api(`/api/portal/integrations/${id}`, {
          method: "PATCH",
          body: { operation },
        }),
      "Integration status updated.",
    );
  const intakeOperation = (operation: string, email?: string) =>
    run(
      () =>
        api("/api/portal/email-intake", {
          method: "PATCH",
          body: { operation, sender: email },
        }),
      operation === "activate"
        ? "Automatic email intake is active."
        : operation === "pause"
          ? "Automatic email intake is paused."
          : operation === "retry"
            ? "Quarantined files were checked again."
            : operation === "add_sender"
              ? "Forwarding address approved."
              : "Forwarding address removed.",
    );
  const copyAddress = async () => {
    if (!intake) return;
    try {
      await navigator.clipboard.writeText(intake.address);
      toast.success("Intake address copied.");
    } catch {
      toast.error(
        "Couldn’t copy automatically",
        `Copy ${intake.address} manually.`,
      );
    }
  };
  const addSender = async (event: FormEvent) => {
    event.preventDefault();
    const value = sender.trim().toLowerCase();
    if (!value) return;
    try {
      await intakeOperation("add_sender", value);
      setSender("");
    } catch {}
  };
  const quarantined = data.inboundEmailEvents.some(
    (item) => item.status === "quarantined",
  );
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect the systems that supply Costivra with trusted, organization-owned records."
      />
      <section className="email-intake portal-panel">
        <div className="email-intake-header">
          <div className="email-intake-title">
            <span className="email-intake-icon">
              <Mail />
            </span>
            <div>
              <span className="eyebrow">AUTOMATIC DOCUMENT INTAKE</span>
              <h2>Forward bills and contracts from work email</h2>
              <p>
                Give vendors this workspace address or create a forwarding rule
                in your current mailbox. Approved attachments become private,
                traceable Costivra records.
              </p>
            </div>
          </div>
          <Status value={intake?.status ?? "unavailable"} />
        </div>
        {intake ? (
          <>
            <div className="email-intake-address">
              <div>
                <small>Your private workspace address</small>
                <strong>{intake.address}</strong>
              </div>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => void copyAddress()}
              >
                <Copy size={16} /> Copy address
              </button>
            </div>
            {!intake.platformReady && (
              <div className="email-intake-notice">
                <ShieldCheck />
                <div>
                  <strong>
                    Costivra platform setup is still being completed.
                  </strong>
                  <span>
                    You can approve forwarding addresses now. Activation will
                    unlock after the receiving domain, signed webhook, and
                    malware scanner are verified.
                  </span>
                </div>
              </div>
            )}
            <div className="email-intake-layout">
              <div className="email-intake-setup">
                <h3>Set up in three steps</h3>
                <ol>
                  <li>
                    <span>1</span>
                    <div>
                      <strong>Approve your forwarding address</strong>
                      <p>
                        Add the exact work email that will send or forward
                        documents. Workspace member emails are trusted
                        automatically.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>Create a mailbox rule</strong>
                      <p>
                        In Outlook or Google Workspace, forward vendor invoices
                        and contracts to the private address above. You can also
                        give this address directly to vendors.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Send one test document</strong>
                      <p>
                        Attach a PDF, DOCX, or TXT file. Costivra verifies the
                        sender, scans the file, prevents duplicates, and
                        preserves the source.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
              <div className="trusted-senders">
                <h3>Approved forwarding addresses</h3>
                {canManage ? (
                  <>
                    <form onSubmit={addSender} className="trusted-sender-form">
                      <label>
                        <span>Work email</span>
                        <input
                          type="email"
                          required
                          value={sender}
                          onChange={(event) => setSender(event.target.value)}
                          placeholder="billing@yourcompany.com"
                        />
                      </label>
                      <button
                        className="button button-primary"
                        type="submit"
                        disabled={!sender.trim()}
                      >
                        <Plus size={16} /> Approve
                      </button>
                    </form>
                    <div className="trusted-sender-list">
                      {intake.trustedSenders.length ? (
                        intake.trustedSenders.map((email) => (
                          <div key={email}>
                            <span>
                              <Mail size={15} />
                              {email}
                            </span>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Remove ${email}`}
                              onClick={() =>
                                void intakeOperation("remove_sender", email)
                              }
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p>
                          No additional forwarding addresses are approved yet.
                        </p>
                      )}
                    </div>
                    <div className="email-intake-controls">
                      {intake.status === "active" ? (
                        <button
                          className="button button-quiet"
                          type="button"
                          onClick={() => void intakeOperation("pause")}
                        >
                          <Pause size={16} /> Pause intake
                        </button>
                      ) : (
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={!intake.platformReady}
                          onClick={() => void intakeOperation("activate")}
                        >
                          <Check size={16} /> Activate intake
                        </button>
                      )}
                      {quarantined && (
                        <button
                          className="button button-quiet"
                          type="button"
                          onClick={() => void intakeOperation("retry")}
                        >
                          <RotateCcw size={16} /> Retry quarantine
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="email-intake-readonly">
                    An owner or administrator manages forwarding access for this
                    workspace.
                  </p>
                )}
              </div>
            </div>
            <div className="email-intake-events">
              <div className="portal-panel-heading">
                <div>
                  <h3>Recent inbound activity</h3>
                  <p>
                    A visible record of what Costivra accepted, quarantined, or
                    rejected.
                  </p>
                </div>
              </div>
              {data.inboundEmailEvents.length ? (
                <div>
                  {data.inboundEmailEvents.map((event) => (
                    <article className="email-intake-event" key={event.id}>
                      <span className="email-event-icon">
                        <Mail size={17} />
                      </span>
                      <div className="grow">
                        <strong>{event.subject || "No subject"}</strong>
                        <span>
                          From {event.senderAddress} · {date(event.receivedAt)}
                        </span>
                        {event.errorMessage && (
                          <small>{event.errorMessage}</small>
                        )}
                      </div>
                      <div className="email-event-result">
                        <Status value={event.status} />
                        <small>
                          {event.processedAttachmentCount}/
                          {event.attachmentCount} files processed
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No inbound messages yet"
                  copy="After activation, send a test document from an approved work email."
                />
              )}
            </div>
          </>
        ) : (
          <div className="email-intake-notice">
            <ShieldCheck />
            <div>
              <strong>
                Email intake is not provisioned for this workspace.
              </strong>
              <span>
                An owner can contact Costivra support to repair the organization
                setup.
              </span>
            </div>
          </div>
        )}
      </section>
      {providerIntegrations.length > 0 && (
        <>
          <div className="portal-section-heading">
            <h2>Other connections</h2>
            <p>
              Authorization is completed in each provider&apos;s secure sign-in
              flow.
            </p>
          </div>
          <div className="portal-card-grid">
            {providerIntegrations.map((item) => (
              <article className="portal-card integration-card" key={item.id}>
                <header>
                  <div className="integration-symbol">
                    {item.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <Status value={item.status} />
                </header>
                <h2>{item.displayName}</h2>
                <p>{item.description}</p>
                <small>
                  {item.lastSyncedAt
                    ? `Last synchronized ${date(item.lastSyncedAt)}`
                    : "No successful synchronization yet"}
                </small>
                <footer>
                  {item.status === "connected" ? (
                    <button
                      className="button button-quiet"
                      onClick={() => void update(item.id, "pause")}
                    >
                      Pause
                    </button>
                  ) : item.status === "paused" ? (
                    <button
                      className="button button-primary"
                      onClick={() => void update(item.id, "resume")}
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      className="button button-primary"
                      onClick={() => void update(item.id, "connect")}
                    >
                      Enable workspace connection
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Reports({ data }: { data: PortalData }) {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Exports generated from the current organization records at download time."
      />
      <div className="portal-card-grid">
        {data.reports.map((item) => (
          <article className="portal-card" key={item.id}>
            <FileText className="card-icon" />
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <small>
              {item.lastGeneratedAt
                ? `Last generated ${date(item.lastGeneratedAt)}`
                : "Not generated yet"}
            </small>
            <footer>
              <a
                className="button button-primary"
                href={`/api/portal/reports/${item.id}`}
              >
                <Download size={16} /> Download CSV
              </a>
            </footer>
          </article>
        ))}
        {!data.reports.length && (
          <Empty
            title="No reports configured"
            copy="Report definitions created for this organization will appear here."
          />
        )}
      </div>
    </>
  );
}

function Team({ data, onInvite }: { data: PortalData; onInvite: () => void }) {
  return (
    <>
      <PageHeader
        title="Team & approvals"
        description="Access and decision authority are visible at the organization level."
        action={
          ["owner", "admin"].includes(data.currentUser.role) ? (
            <button className="button button-primary" onClick={onInvite}>
              <Plus size={16} /> Invite member
            </button>
          ) : undefined
        }
      />
      <section className="portal-panel">
        {data.team.length ? (
          <div className="portal-list">
            {data.team.map((item) => (
              <div className="portal-list-row" key={item.id}>
                <span className="member-avatar">
                  {item.fullName
                    .split(/\s+/)
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="grow">
                  <strong>{item.fullName}</strong>
                  <span>{item.email}</span>
                </div>
                <Status value={item.role} />
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No team members"
            copy="Invite a colleague to establish your approval path."
          />
        )}
      </section>
    </>
  );
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Array<{
    id: string;
    documentId: string;
    documentName: string;
    pageNumber: number;
    quote: string;
  }>;
};
function Ask({ data }: { data: PortalData }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = value.trim();
    if (!question || busy) return;
    setMessages((x) => [...x, { role: "user", content: question }]);
    setValue("");
    setBusy(true);
    try {
      const result = await api("/api/portal/ask", {
        body: { question, sessionId },
      });
      setSessionId(result.sessionId);
      setMessages((x) => [
        ...x,
        {
          role: "assistant",
          content: result.answer,
          citations: result.citations,
        },
      ]);
    } catch (error) {
      setMessages((x) => [
        ...x,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The answer could not be generated.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };
  const suggestions = [
    `Which contracts renew next?`,
    `Where did spending increase?`,
    `What requires my approval?`,
    `Summarize our highest-value opportunity.`,
  ];
  return (
    <div className="portal-chat">
      <header>
        <div>
          <Bot />
          <span>
            <strong>Ask Costivra</strong>
            <small>
              Grounded in {data.documents.length} source document
              {data.documents.length === 1 ? "" : "s"}
            </small>
          </span>
        </div>
        <span className="portal-status status-ready">Citations enforced</span>
      </header>
      <div className="chat-scroll">
        {!messages.length ? (
          <div className="chat-welcome">
            <MessageSquareText />
            <h1>What would you like to understand?</h1>
            <p>
              Ask about your bills, contracts, vendors, findings, or supporting
              evidence.
            </p>
            <div className="chat-suggestions">
              {suggestions.map((item) => (
                <button key={item} onClick={() => setValue(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((item, index) => (
            <div className={`chat-message ${item.role}`} key={index}>
              <span>
                {item.role === "assistant" ? (
                  <Bot />
                ) : (
                  data.currentUser.fullName.slice(0, 1)
                )}
              </span>
              <div>
                <p>{item.content}</p>
                {item.citations?.map((c) => (
                  <a
                    key={c.id}
                    href={`/api/portal/documents/${c.documentId}/download`}
                    title={c.quote}
                  >
                    <FileText size={13} />
                    {c.documentName}
                    {c.pageNumber ? ` · page ${c.pageNumber}` : ""}
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="chat-message assistant">
            <span>
              <Bot />
            </span>
            <div className="typing">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Ask about your organization records…"
          rows={1}
        />
        <button disabled={!value.trim() || busy} aria-label="Send message">
          <Send size={18} />
        </button>
        <small>
          Answers cite available evidence. Review source files before making a
          consequential decision.
        </small>
      </form>
    </div>
  );
}

function Settings({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await run(
        () =>
          api("/api/portal/settings", {
            method: "PATCH",
            body: {
              name: form.get("name"),
              industry: form.get("industry"),
              timezone: form.get("timezone"),
              currency: form.get("currency"),
              primaryContactName: form.get("primaryContactName"),
              reviewThreshold: form.get("reviewThreshold"),
              settings: {
                weeklyDigest: form.get("weeklyDigest") === "on",
                renewalAlerts: form.get("renewalAlerts") === "on",
              },
            },
          }),
        "Settings saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Settings"
        description="Organization profile, alert preferences, and review thresholds."
      />
      <form className="portal-panel settings-form" onSubmit={submit}>
        <div className="form-grid">
          <Field
            label="Organization name"
            name="name"
            defaultValue={data.organization.name}
          />
          <Field
            label="Industry"
            name="industry"
            defaultValue={data.organization.industry ?? ""}
          />
          <Field
            label="Primary contact"
            name="primaryContactName"
            defaultValue={data.organization.primaryContactName ?? ""}
          />
          <Field
            label="Review threshold"
            name="reviewThreshold"
            type="number"
            defaultValue={String(data.organization.reviewThreshold)}
          />
          <Field
            label="Timezone"
            name="timezone"
            defaultValue={data.organization.timezone}
          />
          <Field
            label="Currency"
            name="currency"
            defaultValue={data.organization.currency}
          />
        </div>
        <div className="preference-list">
          <label>
            <span>
              <strong>Weekly operating digest</strong>
              <small>
                Summarize new findings, approvals, and upcoming renewals.
              </small>
            </span>
            <input
              type="checkbox"
              name="weeklyDigest"
              defaultChecked={Boolean(data.organization.settings.weeklyDigest)}
            />
          </label>
          <label>
            <span>
              <strong>Renewal alerts</strong>
              <small>
                Notify the team before contract notice windows close.
              </small>
            </span>
            <input
              type="checkbox"
              name="renewalAlerts"
              defaultChecked={Boolean(data.organization.settings.renewalAlerts)}
            />
          </label>
        </div>
        <div className="portal-form-actions">
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </>
  );
}

function Toolbar({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="portal-toolbar">
      <Search size={17} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      {query && (
        <button onClick={() => setQuery("")} aria-label="Clear search">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}
function SelectField({
  label,
  name,
  options,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <CostivraSelect
        name={name}
        options={options}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}
function DateField({
  label,
  name,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <CostivraDatePicker
        name={name}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}

type VendorDraft = {
  vendorId: string;
  name: string;
  category: string;
  website: string;
  spendAmount: string;
  spendCadence: "monthly" | "annual";
  relationshipStatus: string;
};
const emptyVendorDraft: VendorDraft = {
  vendorId: "",
  name: "",
  category: "",
  website: "",
  spendAmount: "0.00",
  spendCadence: "annual",
  relationshipStatus: "active",
};

function VendorSidePanel({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: PortalData;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draft, setDraft] = useState<VendorDraft>(emptyVendorDraft);
  useEffect(() => {
    if (!open) return;
    try {
      const saved = sessionStorage.getItem("costivra.vendor-panel.draft");
      if (saved) setDraft({ ...emptyVendorDraft, ...JSON.parse(saved) });
    } catch {}
  }, [open]);
  useEffect(() => {
    if (!open) return;
    sessionStorage.setItem(
      "costivra.vendor-panel.draft",
      JSON.stringify(draft),
    );
  }, [draft, open]);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  const q = draft.name.trim().toLowerCase();
  const suggestions = data.vendorCatalog
    .filter(
      (item) =>
        !data.vendors.some((existing) => existing.id === item.id) &&
        (!q ||
          `${item.name} ${item.category} ${item.website ?? ""} ${item.aliases.join(" ")}`
            .toLowerCase()
            .includes(q)),
    )
    .slice(0, 6);
  const selectVendor = (id: string) => {
    const item = data.vendorCatalog.find((entry) => entry.id === id);
    if (!item) return;
    setDraft((current) => ({
      ...current,
      vendorId: item.id,
      name: item.name,
      category: item.category,
      website: item.website ?? "",
    }));
    setShowSuggestions(false);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api("/api/portal/vendors", { body: draft });
      sessionStorage.removeItem("costivra.vendor-panel.draft");
      sessionStorage.removeItem("costivra.vendor-panel.open");
      setDraft(emptyVendorDraft);
      toast.success(
        `${result.name} added.`,
        `Costivra will use the ${draft.spendCadence} amount as the source for annualized spend.`,
      );
      onClose();
      router.push(`/app/vendors/${result.vendorId}`);
      router.refresh();
    } catch (error) {
      toast.error(
        "Vendor wasn’t added",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <aside className="vendor-side-panel" aria-labelledby="vendor-panel-title">
      <header>
        <div>
          <span>New relationship</span>
          <h2 id="vendor-panel-title">Add vendor</h2>
          <p>Your draft stays open while you move around the workspace.</p>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close add vendor panel"
        >
          <X size={18} />
        </button>
      </header>
      <form onSubmit={submit}>
        <div className="vendor-panel-scroll">
          <label className="portal-field vendor-combobox">
            <span>Vendor</span>
            <div className="vendor-search-input">
              <Search size={17} />
              <input
                autoFocus
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="vendor-suggestions"
                value={draft.name}
                onFocus={() => setShowSuggestions(true)}
                onChange={(event) => {
                  const name = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    vendorId: "",
                    name,
                    category: current.vendorId ? "" : current.category,
                    website: current.vendorId ? "" : current.website,
                  }));
                  setShowSuggestions(true);
                }}
                placeholder="Search the vendor directory…"
                required
              />
            </div>
            {showSuggestions && (
              <div
                className="vendor-suggestions"
                id="vendor-suggestions"
                role="listbox"
              >
                {suggestions.length ? (
                  suggestions.map((item) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={draft.vendorId === item.id}
                      key={item.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectVendor(item.id)}
                    >
                      <span className="vendor-monogram">
                        {item.name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {item.category} ·{" "}
                          {item.website
                            ? new URL(item.website).hostname.replace(
                                /^www\./,
                                "",
                              )
                            : "Website not recorded"}
                        </small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))
                ) : (
                  <div className="vendor-custom-option">
                    <strong>Add “{draft.name}” as a custom vendor</strong>
                    <span>
                      Category and website will need to be entered below.
                    </span>
                  </div>
                )}
              </div>
            )}
          </label>
          <div className="vendor-autofill-note">
            <Info size={15} />
            <span>
              {draft.vendorId
                ? "Matched to Costivra’s canonical vendor directory. Category and website came from the verified directory record."
                : "Choose a match to autofill details, or enter a custom vendor."}
            </span>
          </div>
          <div className="vendor-panel-fields">
            <label className="portal-field">
              <span>Category</span>
              <input
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="Software, telecom, energy…"
                required
              />
            </label>
            <label className="portal-field">
              <span>Website</span>
              <input
                value={draft.website}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    website: event.target.value,
                  }))
                }
                placeholder="https://vendor.com"
                inputMode="url"
              />
            </label>
            <div className="vendor-spend-row">
              <label className="portal-field">
                <span>
                  {draft.spendCadence === "monthly"
                    ? "Monthly spend"
                    : "Annual spend"}
                </span>
                <div className="money-input">
                  <span>$</span>
                  <input
                    value={draft.spendAmount}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        spendAmount: event.target.value.replace(
                          /[^0-9.,]/g,
                          "",
                        ),
                      }))
                    }
                    onBlur={() =>
                      setDraft((current) => ({
                        ...current,
                        spendAmount: formatMoneyInput(current.spendAmount),
                      }))
                    }
                    inputMode="decimal"
                    aria-describedby="spend-help"
                    required
                  />
                </div>
              </label>
              <label className="portal-field">
                <span>Billing cadence</span>
                <select
                  value={draft.spendCadence}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      spendCadence: event.target
                        .value as VendorDraft["spendCadence"],
                    }))
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
            </div>
            <p id="spend-help" className="field-help">
              {draft.spendCadence === "monthly"
                ? "Costivra multiplies this amount by 12 for annualized spend."
                : "Costivra stores this amount as annualized spend."}
            </p>
            <label className="portal-field">
              <span>Relationship status</span>
              <select
                value={draft.relationshipStatus}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    relationshipStatus: event.target.value,
                  }))
                }
              >
                <option value="active">Active vendor</option>
                <option value="prospect">Prospective vendor</option>
                <option value="inactive">Inactive vendor</option>
                <option value="terminated">Terminated relationship</option>
              </select>
            </label>
          </div>
          <div className="vendor-monitor-note">
            <Building2 size={18} />
            <div>
              <strong>What Costivra will monitor</strong>
              <span>
                Spend records, source documents, contract dates, and
                evidence-backed findings. Costivra will not invent missing
                terms.
              </span>
            </div>
          </div>
        </div>
        <footer>
          <button
            type="button"
            className="button button-quiet"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={busy || !draft.name.trim() || !draft.category.trim()}
          >
            {busy && <LoaderCircle className="spin" size={16} />}{" "}
            {busy ? "Adding…" : "Add vendor"}
          </button>
        </footer>
      </form>
    </aside>,
    document.body,
  );
}

function CreateModals({
  kind,
  setKind,
  data,
  run,
  presetVendor,
}: {
  kind: ModalState;
  setKind: (kind: ModalState) => void;
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  presetVendor?: string;
}) {
  const [busy, setBusy] = useState(false);
  const close = () => !busy && setKind(null);
  const selectedVendor = data.vendors.find(
    (v) => v.relationshipId === presetVendor,
  );
  const submit =
    (
      url: string,
      success: string,
      serialize?: (form: FormData) => BodyInit | Record<string, unknown>,
    ) =>
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setBusy(true);
      const form = new FormData(e.currentTarget);
      try {
        await run(
          () =>
            api(url, {
              body: serialize ? serialize(form) : Object.fromEntries(form),
            }),
          success,
        );
        setKind(null);
      } catch {
      } finally {
        setBusy(false);
      }
    };
  return (
    <>
      <PortalModal
        open={kind === "contract"}
        title="Add contract"
        description="Track a signed agreement and its decision dates."
        onClose={close}
      >
        <form onSubmit={submit("/api/portal/contracts", "Contract added.")}>
          <div className="form-grid">
            <SelectField
              label="Vendor"
              name="organizationVendorId"
              options={data.vendors.map((v) => ({
                value: v.relationshipId,
                label: v.name,
              }))}
              defaultValue={presetVendor}
            />
            <Field label="Contract title" name="title" />
            <Field
              label="Category"
              name="category"
              defaultValue={selectedVendor?.category}
            />
            <Field label="Annual value" name="annualValue" type="number" />
            <DateField label="Start date" name="startDate" />
            <DateField label="End date" name="endDate" />
            <Field
              label="Notice period (days)"
              name="noticePeriodDays"
              type="number"
              defaultValue="30"
            />
            <Field
              label="Owner"
              name="ownerName"
              defaultValue={data.currentUser.fullName}
              required={false}
            />
          </div>
          <label className="check-field">
            <input type="checkbox" name="autoRenews" /> This agreement renews
            automatically
          </label>
          <FormActions busy={busy} onCancel={close} label="Add contract" />
        </form>
      </PortalModal>
      <PortalModal
        open={kind === "invite"}
        title="Invite team member"
        description="They will receive a secure Supabase invitation email."
        onClose={close}
      >
        <form onSubmit={submit("/api/portal/team", "Invitation sent.")}>
          <div className="form-grid">
            <Field label="Full name" name="fullName" />
            <Field label="Work email" name="email" type="email" />
            <SelectField
              label="Role"
              name="role"
              options={[
                { value: "member", label: "Member" },
                { value: "viewer", label: "Viewer" },
                { value: "admin", label: "Administrator" },
              ]}
            />
          </div>
          <FormActions busy={busy} onCancel={close} label="Send invitation" />
        </form>
      </PortalModal>
      <PortalModal
        open={kind === "upload"}
        title="Upload source document"
        description="PDF, DOCX, or text up to 20 MB. Files stay in private storage."
        onClose={close}
      >
        <form
          onSubmit={submit(
            "/api/portal/documents",
            "Document uploaded and queued for extraction.",
            (form) => form,
          )}
        >
          <SelectField
            label="Vendor (optional)"
            name="organizationVendorId"
            options={[
              { value: "", label: "Unassigned" },
              ...data.vendors.map((v) => ({
                value: v.relationshipId,
                label: v.name,
              })),
            ]}
            defaultValue={presetVendor}
            required={false}
          />
          <label className="upload-field">
            <Upload />
            <strong>Choose a source file</strong>
            <span>PDF, DOCX, or TXT · 20 MB maximum</span>
            <input type="file" name="file" accept=".pdf,.docx,.txt" required />
          </label>
          <FormActions
            busy={busy}
            onCancel={close}
            label="Upload and analyze"
          />
        </form>
      </PortalModal>
      <PortalModal
        open={kind === "expense"}
        title="Add expense"
        description="Record a normalized recurring charge from a source period."
        onClose={close}
      >
        <form onSubmit={submit("/api/portal/expenses", "Expense added.")}>
          <div className="form-grid">
            <SelectField
              label="Vendor"
              name="organizationVendorId"
              options={data.vendors.map((v) => ({
                value: v.relationshipId,
                label: v.name,
              }))}
              defaultValue={presetVendor}
            />
            <Field
              label="Category"
              name="category"
              defaultValue={selectedVendor?.category}
            />
            <DateField
              label="Period start"
              name="periodStart"
              required={true}
            />
            <DateField label="Period end" name="periodEnd" required={true} />
            <Field label="Amount" name="amount" type="number" />
            <Field
              label="Prior period amount"
              name="priorPeriodAmount"
              type="number"
              required={false}
            />
          </div>
          <FormActions busy={busy} onCancel={close} label="Add expense" />
        </form>
      </PortalModal>
    </>
  );
}
