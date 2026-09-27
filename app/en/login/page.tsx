import type { Metadata } from "next";
import LoginPage from "@/app/(auth)/login/page";

export const metadata: Metadata = {
  title: "Sign In - DaPay",
  description: "Sign in to your DaPay account to manage transactions, balance, and digital products.",
};

export default function EnglishLoginPage() {
  return <LoginPage />;
}
