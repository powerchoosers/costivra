import type { Metadata } from "next";
import { PasswordSetup } from "@/components/password-setup";

export const metadata: Metadata = {
  title: "Set owner password",
  robots: { index: false, follow: false },
};

export default function SetPasswordPage() {
  return <PasswordSetup />;
}
