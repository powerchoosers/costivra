type EmailViewerInput = {
  htmlBody: string | null | undefined;
  textBody: string | null | undefined;
  blockExternalImages: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function messageContent(htmlBody: string | null | undefined, textBody: string | null | undefined) {
  if (htmlBody?.trim()) {
    return htmlBody
      .replace(/<base\b[^>]*>/gi, "")
      .replace(/<meta\b[^>]*http-equiv\s*=\s*[\"']?refresh[^>]*>/gi, "");
  }

  return `<pre>${escapeHtml(textBody?.trim() || "No message body was available.")}</pre>`;
}

/**
 * Places untrusted email markup in its own document so its styles cannot alter
 * the CRM. Scripts remain disabled by the iframe sandbox; the CSP blocks all
 * network requests except optional remote images after an operator opts in.
 */
export function buildEmailViewerDocument({
  htmlBody,
  textBody,
  blockExternalImages,
}: EmailViewerInput) {
  const imageSources = blockExternalImages
    ? "data: cid:"
    : "data: cid: https: http:";

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imageSources}; style-src 'unsafe-inline'">
<base target="_blank">
<style>
  html { color-scheme: light; background: #ffffff; }
  body { margin: 0; padding: 24px; color: #1f2937; background: #ffffff; font: 14px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif; overflow-wrap: anywhere; }
  img { max-width: 100% !important; height: auto !important; }
  table { max-width: 100% !important; }
  pre { white-space: pre-wrap; font: inherit; }
  a { color: #1646b9; }
</style>
</head><body>${messageContent(htmlBody, textBody)}</body></html>`;
}
