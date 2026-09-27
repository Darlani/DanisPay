import type { Metadata } from "next";
import RegisterPage from "@/app/(auth)/register/page";

export const metadata: Metadata = {
  title: "Create Account - DaPay",
  description: "Register a DaPay account for digital product transactions, game top-ups, and PPOB services.",
};

export default function EnglishRegisterPage() {
  return <RegisterPage />;
}
