export const COSTIVRA_EMAIL_LOGO_URL =
  "https://costivra.ai/brand/costivra-circuit-mark-cropped.png";

export function escapeEmailHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

export function brandedEmailHtml(input: {
  preview: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footer?: string;
}) {
  const cta = input.cta
    ? `<tr><td style="padding:8px 0 30px"><a href="${escapeEmailHtml(input.cta.href)}" style="display:inline-block;border-radius:12px;background:#002fa7;color:#ffffff;font-size:15px;font-weight:700;line-height:1;text-decoration:none;padding:15px 20px">${escapeEmailHtml(input.cta.label)}</a></td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeEmailHtml(input.preview)}</title>
  </head>
  <body style="margin:0;background:#f3f5f8;color:#162033;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeEmailHtml(input.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f3f5f8">
      <tr>
        <td align="center" style="padding:34px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;border-collapse:separate;border:1px solid #dfe4eb;border-radius:20px;background:#ffffff;overflow:hidden;box-shadow:0 16px 46px rgba(20,31,50,.08)">
            <tr>
              <td style="padding:30px 34px 22px;border-bottom:1px solid #edf0f4">
                <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                  <tr>
                    <td style="padding-right:12px"><img src="${COSTIVRA_EMAIL_LOGO_URL}" width="42" height="42" alt="Costivra" style="display:block;width:42px;height:42px;object-fit:contain;border:0"></td>
                    <td><strong style="display:block;color:#111927;font-size:19px;letter-spacing:-.4px">Costivra</strong><span style="display:block;margin-top:2px;color:#7a8596;font-size:11px;letter-spacing:1.25px;text-transform:uppercase">Every recurring cost, under command.</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 34px 4px">
                <h1 style="margin:0;color:#111927;font-family:Georgia,'Times New Roman',serif;font-size:31px;font-weight:400;line-height:1.18;letter-spacing:-.7px">${escapeEmailHtml(input.heading)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 34px 10px;color:#536074;font-size:16px;line-height:1.72">${input.bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:0 34px">${cta ? `<table role="presentation" cellspacing="0" cellpadding="0">${cta}</table>` : ""}</td>
            </tr>
            <tr>
              <td style="padding:22px 34px 28px;border-top:1px solid #edf0f4;color:#7b8696;font-size:12px;line-height:1.6">${escapeEmailHtml(input.footer ?? "Costivra · costivra.ai")}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
