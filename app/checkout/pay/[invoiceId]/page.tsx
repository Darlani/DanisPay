import { redirect } from "next/navigation";

export default async function LegacyCheckoutPayPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  redirect(`/invoice/${encodeURIComponent(invoiceId)}`);
}
