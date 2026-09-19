import type { Metadata } from "next";
import PublicSandboxPage from "@/app/sandbox/page";

export const metadata: Metadata = {
  title: "DaPay Sandbox - Digital Product Business Simulation",
  description: "Experience and simulate digital product transactions, instant PPOB, and merchant flows in a risk-free environment.",
};

export default function EnglishSandboxPage() {
  return <PublicSandboxPage locale="en" />;
}
