import type { Metadata, Viewport } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://costivra.ai"),
  title: { default: "Costivra — Every recurring cost, under command.", template: "%s | Costivra" },
  description: "Costivra finds, explains, and helps eliminate unnecessary recurring business costs with evidence and approval controls.",
  applicationName: "Costivra",
  keywords: ["business cost intelligence", "recurring expense audit", "contract renewal tracking", "software spend", "telecom bill audit"],
  authors: [{ name: "Costivra" }],
  creator: "Costivra",
  openGraph: {
    type: "website",
    siteName: "Costivra",
    title: "Put every recurring business cost under intelligent control.",
    description: "Find margin leaks, renewal risks, and savings opportunities—then act with evidence and approval controls.",
  },
  twitter: { card: "summary_large_image", title: "Costivra", description: "Every recurring cost, under command." },
  icons: { icon: "/brand/costivra-favicon.png", apple: "/brand/costivra-favicon.png", other: [{ rel: "mask-icon", url: "/brand/costivra-circuit-mark.svg", color: "#0b1115" }] },
};

export const viewport: Viewport = { themeColor: "#f4f1e8", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${jetbrainsMono.variable}`} data-scroll-behavior="smooth">
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
