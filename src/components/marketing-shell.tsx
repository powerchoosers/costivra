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
          <Link className="button button-primary" href="/scan">Scan three bills free <ArrowRight aria-hidden="true" size={17} /></Link>
          <button className={`mobile-menu${open ? " is-open" : ""}`} type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>
            <Menu className="mobile-menu-open-icon" aria-hidden="true" size={22} />
            <X className="mobile-menu-close-icon" aria-hidden="true" size={22} />
          </button>
        </div>
      </div>
      <nav id="mobile-navigation" className={`mobile-drawer${open ? " is-open" : ""}`} aria-label="Mobile navigation" aria-hidden={!open} inert={!open}>
        <span className="mobile-drawer-label">Explore Costivra</span>
        {nav.map(([label, href], index) => <Link key={href} href={href} onClick={() => setOpen(false)}><span>0{index + 1}</span>{label}<ArrowRight aria-hidden="true" size={17} /></Link>)}
        <Link href="/login" onClick={() => setOpen(false)}><span>06</span>Sign in<ArrowRight aria-hidden="true" size={17} /></Link>
        <Link className="button button-primary mobile-drawer-cta" href="/scan" onClick={() => setOpen(false)}>Scan three bills free <ArrowRight aria-hidden="true" size={17} /></Link>
      </nav>
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
