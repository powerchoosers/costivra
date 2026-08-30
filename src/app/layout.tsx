import type { Metadata, Viewport } from "next";
import { Sora, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import { SmoothScroll } from "@/components/smooth-scroll";
import { WorkspaceThemeProvider } from "@/components/workspace-theme";
import "./globals.css";
import "lenis/dist/lenis.css";

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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-brand",
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

export const viewport: Viewport = { themeColor: "#f5f7fa", colorScheme: "light dark" };

const workspaceThemeBootScript = `(() => { try {
  const key = "costivra.workspace.theme";
  const cookieName = "costivra_workspace_theme";
  const stored = localStorage.getItem(key);
  const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(cookieName + "="))?.split("=")[1];
  const preference = ["system", "light", "dark"].includes(stored || "") ? stored : (["system", "light", "dark"].includes(cookie || "") ? cookie : "system");
  const theme = preference === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
  document.documentElement.dataset.workspaceTheme = theme;
  document.documentElement.dataset.workspaceThemePreference = preference;
  document.documentElement.style.colorScheme = theme;
} catch (_) { document.documentElement.dataset.workspaceTheme = "light"; }
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`} data-scroll-behavior="smooth" data-workspace-scrollbar="" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: workspaceThemeBootScript }} /></head>
      <body><WorkspaceThemeProvider><SmoothScroll /><ToastProvider>{children}</ToastProvider></WorkspaceThemeProvider></body>
    </html>
  );
}
