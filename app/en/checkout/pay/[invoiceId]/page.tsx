import { redirect } from "next/navigation";

export default async function LegacyEnglishCheckoutPayPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  redirect(`/en/invoice/${encodeURIComponent(invoiceId)}`);
}
