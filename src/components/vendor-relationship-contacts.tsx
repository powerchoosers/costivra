"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOut,
  CheckCircle2,
  Handshake,
  Mail,
  Pencil,
  Phone,
  Plus,
  UserRound,
} from "@/lib/icons";
import type { PortalVendorContact } from "@/lib/portal/types";
import { useToast } from "@/components/toast-provider";
import { EditRecordSheet } from "@/components/records/edit-record-sheet";

type ContactType = PortalVendorContact["contactType"];
type ContactDraft = {
  contactType: ContactType;
  companyName: string;
  contactName: string;
  title: string;
  email: string;
  phone: string;
  phoneExtension: string;
  websiteUrl: string;
  preferredChannel: PortalVendorContact["preferredChannel"];
  isPrimary: boolean;
  status: PortalVendorContact["status"];
  notes: string;
  markVerified: boolean;
};

const contactTypeLabels: Record<ContactType, string> = {
  vendor: "Vendor contact",
  billing: "Billing",
  support: "Support",
  broker: "Broker",
  consultant: "Consultant",
  other: "Other",
};

const emptyDraft: ContactDraft = {
  contactType: "vendor",
  companyName: "",
  contactName: "",
  title: "",
  email: "",
  phone: "",
  phoneExtension: "",
  websiteUrl: "",
  preferredChannel: "email",
  isPrimary: true,
  status: "active",
  notes: "",
  markVerified: false,
};

function draftFromContact(contact: PortalVendorContact): ContactDraft {
  return {
    contactType: contact.contactType,
    companyName: contact.companyName ?? "",
    contactName: contact.contactName,
    title: contact.title ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    phoneExtension: contact.phoneExtension ?? "",
    websiteUrl: contact.websiteUrl ?? "",
    preferredChannel: contact.preferredChannel,
    isPrimary: contact.isPrimary,
    status: contact.status,
    notes: contact.notes ?? "",
    markVerified: Boolean(contact.lastVerifiedAt),
  };
}

function displayDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Verified date unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function ContactActions({ contact }: { contact: PortalVendorContact }) {
  return (
    <div className="vendor-contact-card__actions" aria-label={`Contact ${contact.contactName}`}>
      {contact.email ? (
        <a href={`mailto:${contact.email}`} className="vendor-contact-card__action">
          <Mail size={14} aria-hidden="true" /> Email
        </a>
      ) : null}
      {contact.phone ? (
        <a href={`tel:${contact.phone}`} className="vendor-contact-card__action">
          <Phone size={14} aria-hidden="true" /> Call
        </a>
      ) : null}
      {contact.websiteUrl ? (
        <a href={contact.websiteUrl} target="_blank" rel="noreferrer" className="vendor-contact-card__action">
          <ArrowSquareOut size={14} aria-hidden="true" /> Open portal
        </a>
      ) : null}
    </div>
  );
}

function ContactCard({ contact, onEdit }: { contact: PortalVendorContact; onEdit: () => void }) {
  return (
    <article className="vendor-contact-card">
      <div className="vendor-contact-card__topline">
        <span className="vendor-contact-card__role">{contactTypeLabels[contact.contactType]}</span>
        {contact.isPrimary ? <span className="vendor-contact-card__primary">Primary</span> : null}
      </div>
      <div className="vendor-contact-card__identity">
        <span className="vendor-contact-card__avatar" aria-hidden="true"><UserRound size={20} /></span>
        <div>
          <h3>{contact.contactName}</h3>
          <p>{[contact.title, contact.companyName].filter(Boolean).join(" · ") || "Relationship contact"}</p>
        </div>
      </div>
      <dl className="vendor-contact-card__details">
        {contact.email ? <div><dt>Email</dt><dd>{contact.email}</dd></div> : null}
        {contact.phone ? <div><dt>Phone</dt><dd>{contact.phone}{contact.phoneExtension ? ` ext. ${contact.phoneExtension}` : ""}</dd></div> : null}
        {contact.preferredChannel !== "email" ? <div><dt>Preferred</dt><dd>{contact.preferredChannel === "portal" ? "Vendor portal" : contact.preferredChannel}</dd></div> : null}
      </dl>
      <div className="vendor-contact-card__footer">
        <ContactActions contact={contact} />
        <div className="vendor-contact-card__footer-meta">
          {contact.lastVerifiedAt ? <span title={`Verified ${displayDate(contact.lastVerifiedAt)}`}><CheckCircle2 size={13} aria-hidden="true" /> Verified</span> : <span>Not verified</span>}
          <button type="button" className="vendor-contact-card__edit" onClick={onEdit} aria-label={`Edit ${contact.contactName}`}>
            <Pencil size={13} aria-hidden="true" /> Edit
          </button>
        </div>
      </div>
    </article>
  );
}

function ContactForm({ draft, setDraft, isExisting }: { draft: ContactDraft; setDraft: (next: ContactDraft) => void; isExisting: boolean }) {
  const update = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => setDraft({ ...draft, [key]: value });
  return (
    <div className="workspace-record-form">
      <div className="workspace-record-form__context vendor-contact-form__context">
        <strong>Keep the relationship actionable</strong>
        <p>Save the person or desk a finance leader should reach when a bill, renewal, or service issue needs attention. Saving this record never sends an email or shares documents.</p>
      </div>
      <div className="workspace-record-form__grid">
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-role">Relationship role</label>
          <select id="vendor-contact-role" className="workspace-record-form__control" value={draft.contactType} onChange={(event) => update("contactType", event.target.value as ContactType)}>
            {Object.entries(contactTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </div>
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-company">Company or firm</label>
          <input id="vendor-contact-company" className="workspace-record-form__control" value={draft.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="e.g. Northstar Energy Advisors" />
        </div>
      </div>
      <div className="workspace-record-form__grid">
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-name">Contact or desk name</label>
          <input id="vendor-contact-name" className="workspace-record-form__control" value={draft.contactName} onChange={(event) => update("contactName", event.target.value)} placeholder="e.g. Alex Morgan or Billing desk" required />
        </div>
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-title">Title or function</label>
          <input id="vendor-contact-title" className="workspace-record-form__control" value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Account executive" />
        </div>
      </div>
      <div className="workspace-record-form__grid">
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-email">Email</label>
          <input id="vendor-contact-email" type="email" className="workspace-record-form__control" value={draft.email} onChange={(event) => update("email", event.target.value)} placeholder="name@company.com" />
        </div>
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-phone">Phone</label>
          <input id="vendor-contact-phone" type="tel" className="workspace-record-form__control" value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="(555) 555-0100" />
        </div>
      </div>
      <div className="workspace-record-form__grid">
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-extension">Extension</label>
          <input id="vendor-contact-extension" className="workspace-record-form__control" value={draft.phoneExtension} onChange={(event) => update("phoneExtension", event.target.value)} placeholder="Optional" />
        </div>
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-website">Portal or website</label>
          <input id="vendor-contact-website" type="url" className="workspace-record-form__control" value={draft.websiteUrl} onChange={(event) => update("websiteUrl", event.target.value)} placeholder="https://..." />
        </div>
      </div>
      <div className="workspace-record-form__grid">
        <div className="workspace-record-form__field">
          <label className="workspace-record-form__label" htmlFor="vendor-contact-preferred">Preferred contact method</label>
          <select id="vendor-contact-preferred" className="workspace-record-form__control" value={draft.preferredChannel} onChange={(event) => update("preferredChannel", event.target.value as ContactDraft["preferredChannel"]) }>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="portal">Vendor portal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="workspace-record-form__field">
          <span className="workspace-record-form__label">Record status</span>
          <label className="workspace-record-form__check"><input type="checkbox" checked={draft.status === "active"} onChange={(event) => update("status", event.target.checked ? "active" : "inactive")} /> Current relationship contact</label>
        </div>
      </div>
      <label className="workspace-record-form__check"><input type="checkbox" checked={draft.isPrimary} onChange={(event) => update("isPrimary", event.target.checked)} /> Primary contact for this role</label>
      {isExisting ? <label className="workspace-record-form__check"><input type="checkbox" checked={draft.markVerified} onChange={(event) => update("markVerified", event.target.checked)} /> Mark these details as verified today</label> : null}
      <div className="workspace-record-form__field">
        <label className="workspace-record-form__label" htmlFor="vendor-contact-notes">Internal relationship note</label>
        <textarea id="vendor-contact-notes" className="workspace-record-form__control workspace-record-form__control--textarea" value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Optional context for your team. Do not add passwords or payment instructions." />
      </div>
    </div>
  );
}

function QuickContactForm({ draft, setDraft }: { draft: ContactDraft; setDraft: (next: ContactDraft) => void }) {
  const update = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => setDraft({ ...draft, [key]: value });
  return (
    <div className="vendor-contact-quick-add__fields">
      <div className="workspace-record-form__field">
        <label className="workspace-record-form__label" htmlFor="quick-vendor-contact-role">Relationship role</label>
        <select id="quick-vendor-contact-role" className="workspace-record-form__control" value={draft.contactType} onChange={(event) => update("contactType", event.target.value as ContactType)}>
          {Object.entries(contactTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </div>
      <div className="workspace-record-form__field">
        <label className="workspace-record-form__label" htmlFor="quick-vendor-contact-name">Contact or desk name</label>
        <input id="quick-vendor-contact-name" className="workspace-record-form__control" value={draft.contactName} onChange={(event) => update("contactName", event.target.value)} placeholder="e.g. Billing desk" required autoFocus />
      </div>
      <div className="workspace-record-form__field">
        <label className="workspace-record-form__label" htmlFor="quick-vendor-contact-email">Email</label>
        <input id="quick-vendor-contact-email" type="email" className="workspace-record-form__control" value={draft.email} onChange={(event) => update("email", event.target.value)} placeholder="name@company.com" />
      </div>
      <div className="workspace-record-form__field">
        <label className="workspace-record-form__label" htmlFor="quick-vendor-contact-phone">Phone</label>
        <input id="quick-vendor-contact-phone" type="tel" className="workspace-record-form__control" value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="(555) 555-0100" />
      </div>
      <label className="workspace-record-form__check vendor-contact-quick-add__primary"><input type="checkbox" checked={draft.isPrimary} onChange={(event) => update("isPrimary", event.target.checked)} /> Primary contact for this role</label>
    </div>
  );
}

export function VendorRelationshipContacts({ relationshipId, contacts, canWrite }: { relationshipId: string; contacts: PortalVendorContact[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContactType, setNewContactType] = useState<ContactType | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(emptyDraft);
  const [savedDraft, setSavedDraft] = useState<ContactDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statePanelRef = useRef<HTMLDivElement>(null);
  const statePanelHeightRef = useRef<number | null>(null);

  const activeContacts = useMemo(() => contacts
    .filter((contact) => contact.status === "active")
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)), [contacts]);
  const vendorContacts = activeContacts.filter((contact) => !["broker", "consultant"].includes(contact.contactType));
  const relationshipContacts = activeContacts.filter((contact) => ["broker", "consultant"].includes(contact.contactType));
  const isOpen = editingId !== null;
  const isNew = newContactType !== null;
  const isExisting = editingId !== null;
  const activeEditorId = editingId ?? (isNew ? "new" : null);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  useLayoutEffect(() => {
    const panel = statePanelRef.current;
    if (!panel) return;

    const nextHeight = panel.getBoundingClientRect().height;
    const previousHeight = statePanelHeightRef.current;
    statePanelHeightRef.current = nextHeight;
    if (previousHeight === null || previousHeight === nextHeight || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = panel.animate(
      [{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }],
      { duration: 220, easing: "cubic-bezier(.22, 1, .36, 1)" },
    );
    return () => animation.cancel();
  }, [isNew]);

  const openNew = (contactType: ContactType) => {
    const next = { ...emptyDraft, contactType };
    setDraft(next);
    setSavedDraft(next);
    setError(null);
    setNewContactType(contactType);
  };

  const openEdit = (contact: PortalVendorContact) => {
    const next = draftFromContact(contact);
    setDraft(next);
    setSavedDraft(next);
    setError(null);
    setNewContactType(null);
    setEditingId(contact.id);
  };

  const close = () => {
    if (saving) return;
    setEditingId(null);
    setNewContactType(null);
    setError(null);
  };

  const save = async () => {
    if (!activeEditorId || (!isNew && !isDirty)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(isNew ? `/api/portal/vendors/${relationshipId}/contacts` : `/api/portal/vendors/${relationshipId}/contacts/${activeEditorId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The contact could not be saved.");
      toast.success(isNew ? "Contact added." : "Contact updated.", "The vendor relationship now has a clearer path to action.");
      setEditingId(null);
      setNewContactType(null);
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Try again.";
      setError(message);
      toast.error("Contact could not be saved.", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="vendor-relationship-contacts" aria-labelledby="vendor-relationship-contacts-heading">
      <div className="vendor-relationship-contacts__heading">
        <div>
          <span className="vendor-relationship-contacts__eyebrow">People & relationship</span>
          <h2 id="vendor-relationship-contacts-heading">Know who to call</h2>
          <p>Keep vendor, billing, support, and intermediary contacts beside the spend and evidence they help you manage.</p>
        </div>
        {canWrite ? <button type="button" className="workspace-record-button workspace-record-button--secondary workspace-record-button--small" onClick={() => openNew("vendor")}><Plus size={14} aria-hidden="true" /> Add contact</button> : null}
      </div>
      <div ref={statePanelRef} className="vendor-contact-state-panel">
        <div key={isNew ? "add" : "summary"} className="vendor-contact-state-panel__content">
      {isNew ? <form className="vendor-contact-quick-add" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="vendor-contact-quick-add__heading"><div><strong>Add a relationship contact</strong><p>Start with the person or desk your team would use first. You can add more detail later.</p></div></div>
          <QuickContactForm draft={draft} setDraft={setDraft} />
          {error ? <p className="vendor-contact-quick-add__error" role="alert">{error}</p> : null}
          <div className="vendor-contact-quick-add__actions"><button type="button" className="workspace-record-button workspace-record-button--secondary workspace-record-button--small" onClick={close} disabled={saving}>Cancel</button><button type="submit" className="workspace-record-button workspace-record-button--primary workspace-record-button--small" disabled={saving}>{saving ? "Saving" : "Save contact"}</button></div>
        </form> : <div className="vendor-relationship-contacts__groups">
        <div className={`vendor-contact-group${vendorContacts.length ? "" : " vendor-contact-group--empty"}`}>
          <div className="vendor-contact-group__heading"><div><h3>Vendor contacts</h3><p>People or desks at the supplier.</p></div>{canWrite ? <button type="button" className="vendor-contact-group__add" onClick={() => openNew("vendor")}><Plus size={14} aria-hidden="true" /> Add</button> : null}</div>
          {vendorContacts.length ? <div className="vendor-contact-group__cards">{vendorContacts.map((contact) => <ContactCard key={contact.id} contact={contact} onEdit={() => openEdit(contact)} />)}</div> : <div className="vendor-contact-group__empty"><UserRound size={18} aria-hidden="true" /><span>{canWrite ? "Add the person or desk your team should contact first." : "No vendor contact has been recorded yet."}</span></div>}
        </div>
        <div className={`vendor-contact-group vendor-contact-group--relationship${relationshipContacts.length ? "" : " vendor-contact-group--empty"}`}>
          <div className="vendor-contact-group__heading"><div><h3>Broker or consultant</h3><p>Who helped set this up or advises the relationship.</p></div>{canWrite ? <button type="button" className="vendor-contact-group__add" onClick={() => openNew("broker")}><Plus size={14} aria-hidden="true" /> Add</button> : null}</div>
          {relationshipContacts.length ? <div className="vendor-contact-group__cards">{relationshipContacts.map((contact) => <ContactCard key={contact.id} contact={contact} onEdit={() => openEdit(contact)} />)}</div> : <div className="vendor-contact-group__empty"><Handshake size={18} aria-hidden="true" /><span>{canWrite ? "Record the broker or consultant so the relationship is not a dead end." : "No broker or consultant has been recorded."}</span></div>}
        </div>
        </div>}
        </div>
      </div>
      <p className="vendor-relationship-contacts__privacy">Visible to authorized members of this workspace. Costivra does not contact these people, share documents, or create a referral from this record.</p>

      <EditRecordSheet
        title="Edit relationship contact"
        subtitle="This information stays within your Costivra workspace."
        isOpen={isOpen}
        onClose={close}
        onSave={save}
        isDirty={isDirty}
        saving={saving}
        error={error}
        onKeepDraft={() => setError(null)}
      >
        <ContactForm draft={draft} setDraft={setDraft} isExisting={isExisting} />
      </EditRecordSheet>
    </section>
  );
}
