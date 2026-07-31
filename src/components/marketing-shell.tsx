"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/brand";

const nav = [
  ["Product", "/product"],
  ["Solutions", "/solutions"],
  ["How it works", "/how-it-works"],
  ["Pricing", "/pricing"],
  ["Security", "/security"],
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="marketing-header">
      <div className="container marketing-header-inner">
        <Brand />
        <nav className="marketing-nav" aria-label="Primary navigation">
          {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="sign-in" href="/login">Sign in</Link>
          <Link className="button button-primary" href="/scan">Run a free cost scan <ArrowRight aria-hidden="true" size={17} /></Link>
          <button className="button button-quiet mobile-menu" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="mobile-drawer" aria-label="Mobile navigation">
          <span className="mobile-drawer-label">Explore Costivra</span>
          {nav.map(([label, href], index) => <Link key={href} href={href} onClick={() => setOpen(false)}><span>0{index + 1}</span>{label}<ArrowRight aria-hidden="true" size={17} /></Link>)}
          <Link href="/login" onClick={() => setOpen(false)}><span>06</span>Sign in<ArrowRight aria-hidden="true" size={17} /></Link>
          <Link className="button button-primary mobile-drawer-cta" href="/scan" onClick={() => setOpen(false)}>Run a free cost scan <ArrowRight aria-hidden="true" size={17} /></Link>
        </nav>
      ) : null}
    </header>
  );
}

const columns = [
  { title: "Product", links: [["How it works", "/how-it-works"], ["Solutions", "/solutions"], ["Integrations", "/integrations"], ["Pricing", "/pricing"]] },
  { title: "Company", links: [["About", "/about"], ["Case studies", "/case-studies"], ["Partners", "/partners"], ["Contact", "/contact"]] },
  { title: "Resources", links: [["Cost leak scan", "/scan"], ["Help center", "/help"], ["Security", "/security"], ["System status", "/status"]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"], ["Security", "/security"], ["UCEP disclosure", "/ucep-disclosure"]] },
] as const;

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand light />
            <p>Find the leak.<br />Prove the value.<br />Recover with confidence.</p>
          </div>
          {columns.map((column) => (
            <div className="footer-column" key={column.title}>
              <strong>{column.title}</strong>
              {column.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 Costivra. Every recurring cost, under command.</span>
          <span>Built for evidence, approval, and verified outcomes.</span>
        </div>
      </div>
    </footer>
  );
}
