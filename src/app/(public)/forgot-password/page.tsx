import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/forms";
export const metadata: Metadata = { title: "Reset password" };
export default function Page() {
  return <AuthShell title="Reset your password" subtitle="Enter your email and we'll send a reset link."><ForgotForm /></AuthShell>;
}
