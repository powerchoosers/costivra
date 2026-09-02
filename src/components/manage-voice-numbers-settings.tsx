"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CircleAlert, LoaderCircle, Phone, PhoneOff, Search, Users } from "@/lib/icons";
import { useToast } from "@/components/toast-provider";

type NumberRow = { id: string; phone_number: string; friendly_name: string | null; status: string; is_main: boolean; capabilities: Record<string, boolean>; monthly_price_cents: number | null; currency: string; routes: { operator_id: string; priority: number; enabled: boolean }[] };
type StaffRow = { id: string; email: string; fullName: string };
type SearchState = "idle" | "loading" | "results" | "empty" | "error";
function money(cents: number | null, currency: string) { return cents == null ? "Price shown by Twilio" : new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100) + "/month"; }

export function ManageVoiceNumbersSettings() {
  const toast = useToast();
  const [numbers, setNumbers] = useState<NumberRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [available, setAvailable] = useState<{ phoneNumber: string; locality: string | null; region: string | null; monthlyPriceCents: number | null; currency: string }[]>([]);
  const [areaCode, setAreaCode] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseClosing, setPurchaseClosing] = useState(false);
  const [purchaseOpening, setPurchaseOpening] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!selected || purchaseClosing || !purchaseOpening) return;
    const frame = window.requestAnimationFrame(() => setPurchaseOpening(false));
    return () => window.cancelAnimationFrame(frame);
  }, [purchaseClosing, purchaseOpening, selected]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/manage/voice/numbers", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setNumbers(payload.numbers ?? []); setStaff(payload.staff ?? []); }
    catch (error) { toast.error("Phone inventory unavailable", error instanceof Error ? error.message : "Try again shortly."); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function search() {
    setSearching(true);
    setSearchState("loading");
    setSearchError(null);
    setAvailable([]);
    setSelected(null);
    setPurchaseClosing(false);
    setPurchaseOpening(false);
    try {
      const response = await fetch(`/api/manage/voice/numbers?available=1&areaCode=${encodeURIComponent(areaCode)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const nextNumbers = payload.numbers ?? [];
      setAvailable(nextNumbers);
      setSearchState(nextNumbers.length > 0 ? "results" : "empty");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again shortly.";
      setSearchError(message);
      setSearchState("error");
      toast.error("Number search failed", message);
    } finally { setSearching(false); }
  }
  function openPurchase(phoneNumber: string) {
    if (selected === phoneNumber) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setSelected(null);
        setPurchaseClosing(false);
        setPurchaseOpening(false);
      } else {
        setPurchaseClosing(true);
      }
      return;
    }
    setPurchaseClosing(false);
    setPurchaseOpening(true);
    setSelected(phoneNumber);
  }
  async function purchase() {
    if (!selected) return;
    setPurchasing(true);
    try {
      const response = await fetch("/api/manage/voice/numbers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumber: selected, confirmed: true }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      toast.success("Number purchased", "It is in Costivra inventory and is not public until you designate it as the main number.");
      setAvailable([]);
      setSearchState("idle");
      setSelected(null);
      setPurchaseClosing(false);
      setPurchaseOpening(false);
      await load();
    } catch (error) { toast.error("Number was not purchased", error instanceof Error ? error.message : "Try again."); }
    finally { setPurchasing(false); }
  }
  async function update(id: string, body: Record<string, unknown>, message: string) { setSaving(id); try { const response = await fetch(`/api/manage/voice/numbers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); toast.success(message); await load(); } catch (error) { toast.error("Phone setting was not saved", error instanceof Error ? error.message : "Try again."); } finally { setSaving(null); } }
  return <div className="manage-settings-tab-panel manage-voice-number-settings">
    <section className="manage-panel" aria-labelledby="voice-number-settings-title">
      <header className="manage-settings-enrichment-heading"><div><span className="manage-settings-kicker">Owner controls</span><h3 id="voice-number-settings-title">Costivra phone numbers</h3><p>Search Twilio inventory, purchase with an explicit confirmation, and choose which operators receive the main line. Nothing appears on the public site until a purchased number is designated as main.</p></div><Phone size={22} aria-hidden="true" /></header>
      <div className="manage-voice-number-search" aria-busy={searching}><label><span>Area code</span><input inputMode="numeric" maxLength={3} value={areaCode} disabled={searching} onChange={event => setAreaCode(event.target.value.replace(/\D/g, ""))} onKeyDown={event => { if (event.key === "Enter" && !searching) { event.preventDefault(); void search(); } }} placeholder="e.g. 214" /></label><button type="button" className="manage-button manage-button--quiet" disabled={searching} onClick={() => void search()}><Search size={15} className={searching ? "is-spinning" : undefined} />{searching ? "Searching…" : "Search available numbers"}</button></div>
      <div className={`manage-voice-number-search-feedback ${searchState !== "idle" ? "is-open" : ""}`} aria-live="polite">
        <div className="manage-voice-number-search-feedback-inner">
          {searchState === "loading" && <><div className="manage-voice-number-search-state manage-voice-number-search-state--loading"><LoaderCircle className="is-spinning" size={17} /><div><strong>Searching Twilio inventory</strong><span>Checking available numbers for this area.</span></div></div><div className="manage-voice-number-results-skeleton" aria-hidden="true">{[0, 1, 2].map(index => <div className="manage-voice-number-result-skeleton" key={index}><span className="manage-voice-number-result-skeleton-copy"><span className="manage-voice-skeleton-line manage-voice-skeleton-line--wide" /><span className="manage-voice-skeleton-line manage-voice-skeleton-line--medium" /></span><span className="manage-voice-skeleton-status manage-voice-number-result-skeleton-price" /></div>)}</div></>}
          {searchState === "empty" && <div className="manage-voice-number-search-state manage-voice-number-search-state--empty"><PhoneOff size={18} /><div><strong>No numbers found</strong><span>Twilio did not return an available number for this area code. Try a nearby area code.</span></div></div>}
          {searchState === "error" && <div className="manage-voice-number-search-state manage-voice-number-search-state--error"><CircleAlert size={18} /><div><strong>Search unavailable</strong><span>{searchError || "Twilio did not return a result. Try again shortly."}</span></div><button type="button" className="manage-button manage-button--quiet" onClick={() => void search()}>Try again</button></div>}
          {searchState === "results" && available.length > 0 && <div className="manage-voice-number-results" aria-label="Available Twilio numbers">{available.map(number => <div className="manage-voice-number-result-item" key={number.phoneNumber}><button type="button" className={selected === number.phoneNumber ? "is-selected" : ""} onClick={() => openPurchase(number.phoneNumber)}><span><strong>{number.phoneNumber}</strong><small>{[number.locality, number.region].filter(Boolean).join(", ") || "United States"}</small></span><em>{money(number.monthlyPriceCents, number.currency)}</em></button>{selected === number.phoneNumber && <div className={`manage-voice-number-confirm-wrap${purchaseClosing ? " is-closing" : purchaseOpening ? " is-opening" : " is-open"}`} aria-hidden={purchaseClosing} onTransitionEnd={event => { if (purchaseClosing && event.currentTarget === event.target && event.propertyName === "grid-template-rows") { setSelected(null); setPurchaseClosing(false); } }}><div className="manage-voice-number-confirm" role="region" aria-labelledby="voice-number-confirm-title"><div><span className="manage-settings-kicker">Ready to purchase</span><strong id="voice-number-confirm-title">{selected}</strong><span>{[number.locality, number.region].filter(Boolean).join(", ") || "United States"} · {money(number.monthlyPriceCents, number.currency)}</span></div><p>Twilio will charge the monthly number fee. This number stays private until you make it the main number.</p><button type="button" className="manage-button manage-button--primary" disabled={purchasing || purchaseClosing} onClick={() => void purchase()}>{purchasing ? "Purchasing…" : "Purchase number"}</button></div></div>}</div>)}</div>}
        </div>
      </div>
    </section>
    <section className="manage-panel" aria-labelledby="owned-number-settings-title"><header className="manage-settings-enrichment-heading"><div><h3 id="owned-number-settings-title">Purchased numbers</h3><p>Routing uses the browser phone in each selected operator’s active Costivra session. Up to ten can ring together.</p></div><Users size={20} aria-hidden="true" /></header>
      {loading ? <div className="manage-voice-inventory-skeleton" role="status" aria-label="Loading phone inventory"><span className="manage-visually-hidden">Loading phone inventory</span>{[0, 1].map(index => <div className="manage-voice-skeleton-row" aria-hidden="true" key={index}><span className="manage-voice-skeleton-icon" /><div className="manage-voice-skeleton-copy"><span className="manage-voice-skeleton-line manage-voice-skeleton-line--wide" /><span className="manage-voice-skeleton-line manage-voice-skeleton-line--medium" /></div><span className="manage-voice-skeleton-status" /></div>)}</div> : numbers.length === 0 ? <p className="manage-settings-empty">No Costivra numbers purchased yet. Search above to choose one from the live Twilio inventory.</p> : <div className="manage-owned-voice-numbers">{numbers.map(number => { const routeIds = number.routes.filter(route => route.enabled).map(route => route.operator_id); return <article key={number.id}><div className="manage-owned-voice-number-heading"><div><strong>{number.phone_number}</strong><small>{number.friendly_name || "Twilio number"} · {money(number.monthly_price_cents, number.currency)}</small></div>{number.is_main && <span className="manage-status manage-status--active"><i />Main number</span>}</div><div className="manage-owned-voice-number-actions"><button type="button" className="manage-button manage-button--quiet" disabled={Boolean(number.is_main) || saving === number.id} onClick={() => void update(number.id, { isMain: true }, "Main number updated. The public phone will follow this setting.")}><Check size={14} />{number.is_main ? "Public main number" : "Make main number"}</button><div className="manage-voice-route-list"><span>Ring operators</span>{staff.map(person => <label key={person.id}><input type="checkbox" checked={routeIds.includes(person.id)} disabled={saving === number.id} onChange={event => { const next = event.target.checked ? [...routeIds, person.id] : routeIds.filter(id => id !== person.id); void update(number.id, { operatorIds: next }, "Call routing updated."); }} /><span>{person.fullName || person.email}</span></label>)}</div></div></article>; })}</div>}
    </section>
  </div>;
}
