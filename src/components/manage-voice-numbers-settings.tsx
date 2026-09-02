"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Phone, Search, Users } from "@/lib/icons";
import { useToast } from "@/components/toast-provider";

type NumberRow = { id: string; phone_number: string; friendly_name: string | null; status: string; is_main: boolean; capabilities: Record<string, boolean>; monthly_price_cents: number | null; currency: string; routes: { operator_id: string; priority: number; enabled: boolean }[] };
type StaffRow = { id: string; email: string; fullName: string };

function money(cents: number | null, currency: string) { return cents == null ? "Price shown by Twilio" : new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100) + "/month"; }

export function ManageVoiceNumbersSettings() {
  const toast = useToast();
  const [numbers, setNumbers] = useState<NumberRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [available, setAvailable] = useState<{ phoneNumber: string; locality: string | null; region: string | null; monthlyPriceCents: number | null; currency: string }[]>([]);
  const [areaCode, setAreaCode] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/manage/voice/numbers", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setNumbers(payload.numbers ?? []); setStaff(payload.staff ?? []); }
    catch (error) { toast.error("Phone inventory unavailable", error instanceof Error ? error.message : "Try again shortly."); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function search() { setSearching(true); try { const response = await fetch(`/api/manage/voice/numbers?available=1&areaCode=${encodeURIComponent(areaCode)}`); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setAvailable(payload.numbers ?? []); } catch (error) { toast.error("Number search failed", error instanceof Error ? error.message : "Try again."); } finally { setSearching(false); } }
  async function purchase() { if (!selected || confirm !== selected) return; setPurchasing(true); try { const response = await fetch("/api/manage/voice/numbers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumber: selected, confirmNumber: confirm }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); toast.success("Number purchased", "It is in Costivra inventory and is not public until you designate it as the main number."); setSelected(null); setConfirm(""); setAvailable([]); await load(); } catch (error) { toast.error("Number was not purchased", error instanceof Error ? error.message : "Try again."); } finally { setPurchasing(false); } }
  async function update(id: string, body: Record<string, unknown>, message: string) { setSaving(id); try { const response = await fetch(`/api/manage/voice/numbers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); toast.success(message); await load(); } catch (error) { toast.error("Phone setting was not saved", error instanceof Error ? error.message : "Try again."); } finally { setSaving(null); } }

  return <div className="manage-settings-tab-panel manage-voice-number-settings">
    <section className="manage-panel" aria-labelledby="voice-number-settings-title">
      <header className="manage-settings-enrichment-heading"><div><span className="manage-settings-kicker">Owner controls</span><h3 id="voice-number-settings-title">Costivra phone numbers</h3><p>Search Twilio inventory, purchase with an explicit confirmation, and choose which operators receive the main line. Nothing appears on the public site until a purchased number is designated as main.</p></div><Phone size={22} aria-hidden="true" /></header>
      <div className="manage-voice-number-search"><label><span>Area code</span><input inputMode="numeric" maxLength={3} value={areaCode} onChange={event => setAreaCode(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 214" /></label><button type="button" className="manage-button manage-button--quiet" disabled={searching} onClick={() => void search()}><Search size={15} />{searching ? "Searching…" : "Search available numbers"}</button></div>
      {selected && <div className="manage-voice-number-confirm"><strong>Confirm purchase</strong><span>Twilio may charge monthly number fees after the trial. Type the exact number to continue.</span><input aria-label="Confirm phone number" value={confirm} onChange={event => setConfirm(event.target.value)} placeholder={selected} /><button type="button" className="manage-button manage-button--primary" disabled={purchasing || confirm !== selected} onClick={() => void purchase()}>{purchasing ? "Purchasing…" : "Purchase number"}</button></div>}
      {available.length > 0 && <div className="manage-voice-number-results" aria-label="Available Twilio numbers">{available.map(number => <button type="button" key={number.phoneNumber} className={selected === number.phoneNumber ? "is-selected" : ""} onClick={() => { setSelected(number.phoneNumber); setConfirm(""); }}><span><strong>{number.phoneNumber}</strong><small>{[number.locality, number.region].filter(Boolean).join(", ") || "United States"}</small></span><em>{money(number.monthlyPriceCents, number.currency)}</em></button>)}</div>}
    </section>
    <section className="manage-panel" aria-labelledby="owned-number-settings-title"><header className="manage-settings-enrichment-heading"><div><h3 id="owned-number-settings-title">Purchased numbers</h3><p>Routing uses the browser phone in each selected operator’s active Costivra session. Up to ten can ring together.</p></div><Users size={20} aria-hidden="true" /></header>
      {loading ? <p className="manage-settings-empty"><LoaderCircle className="is-spinning" size={17} /> Loading phone inventory…</p> : numbers.length === 0 ? <p className="manage-settings-empty">No Costivra numbers purchased yet. Search above to choose one from the live Twilio inventory.</p> : <div className="manage-owned-voice-numbers">{numbers.map(number => { const routeIds = number.routes.filter(route => route.enabled).map(route => route.operator_id); return <article key={number.id}><div className="manage-owned-voice-number-heading"><div><strong>{number.phone_number}</strong><small>{number.friendly_name || "Twilio number"} · {money(number.monthly_price_cents, number.currency)}</small></div>{number.is_main && <span className="manage-status manage-status--active"><i />Main number</span>}</div><div className="manage-owned-voice-number-actions"><button type="button" className="manage-button manage-button--quiet" disabled={Boolean(number.is_main) || saving === number.id} onClick={() => void update(number.id, { isMain: true }, "Main number updated. The public phone will follow this setting.")}><Check size={14} />{number.is_main ? "Public main number" : "Make main number"}</button><div className="manage-voice-route-list"><span>Ring operators</span>{staff.map(person => <label key={person.id}><input type="checkbox" checked={routeIds.includes(person.id)} disabled={saving === number.id} onChange={event => { const next = event.target.checked ? [...routeIds, person.id] : routeIds.filter(id => id !== person.id); void update(number.id, { operatorIds: next }, "Call routing updated."); }} /><span>{person.fullName || person.email}</span></label>)}</div></div></article>; })}</div>}
    </section>
  </div>;
}
