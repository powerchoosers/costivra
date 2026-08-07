import { ImageResponse } from "next/og";

export const alt = "Costivra — Every recurring cost, under command.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COSTIVRA_MARK_URL = "https://costivra.ai/brand/costivra-circuit-mark-cropped.png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#101616", background: "#f4f1e8", padding: "68px 76px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 42, fontWeight: 800 }}>
        {/* next/og uses a plain image element so Satori can embed the remote brand asset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={COSTIVRA_MARK_URL} width={64} height={64} alt="" style={{ objectFit: "contain" }} />
        Costivra
      </div>
      <div style={{ display: "flex", maxWidth: 970, fontSize: 76, lineHeight: .98, letterSpacing: "-4px", fontWeight: 650 }}>Put every recurring business cost under intelligent control.</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #101616", paddingTop: 24, fontFamily: "monospace", fontSize: 22 }}><span>Evidence-backed. Approval-controlled.</span><span style={{ color: "#315cff" }}>costivra.ai</span></div>
    </div>,
    size,
  );
}
