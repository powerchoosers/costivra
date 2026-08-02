export type EmailSignatureProfile = {
  fullName: string;
  jobTitle?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  avatarCid?: string | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "C";

export function normalizeLinkedInUrl(value: string | null | undefined) {
  const candidate = value?.trim() ?? "";
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (host !== "linkedin.com" && !host.endsWith(".linkedin.com"))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function buildEmailSignatureHtml(profile: EmailSignatureProfile) {
  const name = escapeHtml(profile.fullName.trim() || "Costivra");
  const title = profile.jobTitle?.trim() ? escapeHtml(profile.jobTitle.trim()) : null;
  const phone = profile.phone?.trim() ? escapeHtml(profile.phone.trim()) : null;
  const linkedin = normalizeLinkedInUrl(profile.linkedinUrl);
  const avatar = profile.avatarCid
    ? `<img src="cid:${escapeHtml(profile.avatarCid)}" width="48" height="48" alt="" style="display:block;border:0;border-radius:24px;outline:none;text-decoration:none;" />`
    : `<span style="display:inline-block;width:48px;height:48px;border-radius:24px;background:#eaf0fb;color:#002fa7;font-family:Arial,sans-serif;font-size:14px;font-weight:700;line-height:48px;text-align:center;">${initials(profile.fullName)}</span>`;
  const phoneHref = phone?.replace(/[^+\d]/g, "") || null;
  const details = [
    phone ? `<a href="tel:${escapeHtml(phoneHref || "")}" style="color:#002fa7;text-decoration:none;font-weight:700;">${phone}</a>` : null,
    `<a href="https://costivra.ai" target="_blank" rel="noopener noreferrer" style="color:#002fa7;text-decoration:none;font-weight:700;">costivra.ai</a>`,
    linkedin ? `<a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener noreferrer" style="color:#002fa7;text-decoration:none;font-weight:700;">LinkedIn</a>` : null,
  ].filter(Boolean).join('<span style="color:#b5bdca;padding:0 8px;">|</span>');

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;margin-top:24px;font-family:Arial,Helvetica,sans-serif;color:#1d2b3a;border-collapse:collapse;"><tr><td style="padding:0 0 16px;border-top:1px solid #d9e2ec;font-size:1px;line-height:1px;">&nbsp;</td></tr><tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="width:3px;background:#002fa7;border-radius:3px;"></td><td style="padding:0 0 0 13px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="padding:0 0 10px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="padding:0 8px 0 0;"><img src="${COSTIVRA_EMAIL_LOGO_URL}" width="28" height="25" alt="Costivra" style="display:block;width:28px;height:25px;object-fit:contain;border:0;outline:none;text-decoration:none;" /></td><td style="vertical-align:middle;"><strong style="display:block;color:#111927;font-size:14px;line-height:16px;letter-spacing:-.2px;">Costivra</strong></td></tr></table></td></tr><tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="padding:1px 11px 0 0;vertical-align:top;">${avatar}</td><td style="vertical-align:middle;"><div style="font-size:18px;font-weight:700;line-height:22px;color:#172942;">${name}</div>${title ? `<div style="padding-top:1px;color:#1f5cba;font-size:13px;font-weight:700;font-style:italic;line-height:18px;">${title}</div>` : ""}</td></tr></table></td></tr><tr><td style="padding:8px 0 0;color:#526075;font-size:12px;line-height:18px;">${details}</td></tr><tr><td style="padding:5px 0 0;color:#667085;font-size:11px;line-height:16px;">Every recurring cost, under command.</td></tr></table></td></tr></table></td></tr><tr><td style="padding:14px 0 0;border-top:1px solid #d9e2ec;color:#6b7480;font-size:8.5px;line-height:12px;"><strong style="color:#172942;">CONFIDENTIALITY DISCLAIMER:</strong> This email and any attachments may contain confidential information intended only for the named recipient. Please handle it in accordance with applicable privacy and electronic-communications laws, including the Electronic Communications Privacy Act (ECPA), 18 U.S.C. §§ 2510–2521. Unauthorized review, use, disclosure, or distribution is prohibited. If you received it in error, please notify the sender and delete all copies.</td></tr></table>`;
}

export function appendEmailSignatureHtml(bodyHtml: string, profile: EmailSignatureProfile) {
  const body = bodyHtml.trim();
  const signature = buildEmailSignatureHtml(profile);
  return `${body}${body ? "<br>" : ""}${signature}`;
}
import { COSTIVRA_EMAIL_LOGO_URL } from "@/lib/email/brand";
