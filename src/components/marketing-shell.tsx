"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "@/lib/icons";
import { useEffect, useRef, useState } from "react";
import { Brand } from "@/components/brand";

const nav = [
  ["Product", "/product"],
  ["What we review", "/solutions"],
  ["How it works", "/how-it-works"],
  ["Security", "/security"],
  ["Pricing", "/pricing"],
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const previousScrollYRef = useRef(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateScrolledState = () => {
      const y = window.scrollY;
      const previousY = previousScrollYRef.current;
      const movedDown = y > previousY + 1;
      const movedUp = y < previousY - 1;

      if (y <= 12 || movedUp) {
        setScrolled(false);
      } else if (movedDown) {
        setScrolled(true);
      }

      previousScrollYRef.current = y;
    };

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const focusTimer = window.requestAnimationFrame(() => {
      mobileNavigationRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    });

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [open]);

  useEffect(() => {
    mobileNavigationRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  return (
    <>
      <header className={`marketing-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="container marketing-header-inner">
        <Brand />
        <nav className="marketing-nav" aria-label="Primary navigation">
          {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="sign-in" href="/login">Sign in</Link>
          <Link className="button button-primary" href="/scan">Start with 3 bills <ArrowRight aria-hidden="true" size={17} /></Link>
          <button ref={menuButtonRef} className={`mobile-menu${open ? " is-open" : ""}`} type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => open ? closeMenu() : setOpen(true)}>
            {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>
      </div>
      </header>
      <div className={`mobile-backdrop${open ? " is-open" : ""}`} aria-hidden="true" onClick={closeMenu} />
      <nav ref={mobileNavigationRef} id="mobile-navigation" className={`mobile-drawer${open ? " is-open" : ""}`} aria-label="Mobile navigation" aria-hidden={!open}>
        <span id="mobile-navigation-label" className="mobile-drawer-label">Explore Costivra</span>
        {nav.map(([label, href], index) => <Link key={href} href={href} aria-label={label} onClick={closeMenu}><span aria-hidden="true">0{index + 1}</span>{label}<ArrowRight aria-hidden="true" size={17} /></Link>)}
        <Link href="/login" onClick={closeMenu}><span>06</span>Sign in<ArrowRight aria-hidden="true" size={17} /></Link>
        <Link className="button button-primary mobile-drawer-cta" href="/scan" onClick={closeMenu}>Start with 3 bills <ArrowRight aria-hidden="true" size={17} /></Link>
      </nav>
    </>
  );
}

const columns = [
  { title: "Product", links: [["How it works", "/how-it-works"], ["Solutions", "/solutions"], ["Software", "/solutions/software"], ["Telecom", "/solutions/telecom"], ["Energy", "/solutions/energy"], ["Insurance & Benefits (planned)", "/solutions/insurance"], ["Facilities (planned)", "/solutions/facilities"], ["Pricing", "/pricing"]] },
  { title: "Company", links: [["About", "/about"], ["Case studies", "/case-studies"], ["Partners", "/partners"], ["Contact", "/contact"]] },
  { title: "Resources", links: [["Start with 3 bills", "/scan"], ["Help center", "/help"], ["Security", "/security"], ["System status", "/status"]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"], ["UCEP disclosure", "/ucep-disclosure"]] },
] as const;

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="container">
        <div className="footer-intro">
          <div><span className="eyebrow">A clearer next step</span><h2>Start with three bills. Keep the evidence.</h2><p>Costivra reviews the selected documents, shows what changed, and keeps every finding tied to the source.</p></div>
          <Link className="button footer-cta" href="/scan">Start with 3 bills <ArrowRight aria-hidden="true" size={17} /></Link>
        </div>
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand light />
            <p>Evidence-first control for recurring business costs.</p>
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
          <span>Built for evidence, approval, and verified outcomes. <a href="https://logo.dev" target="_blank" rel="noreferrer">Logos by Logo.dev</a></span>
        </div>
      </div>
    </footer>
  );
}
