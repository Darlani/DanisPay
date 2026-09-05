export type AppRole = "admin" | "manager" | "member";

export type AdminCapability =
  | "overview.view"
  | "analytics.view"
  | "category.view"
  | "products.view"
  | "account_database.view"
  | "events.view"
  | "payment.view"
  | "orders.view"
  | "deposit.view"
  | "withdrawal.view"
  | "providers.view"
  | "explore.view"
  | "history.view"
  | "settings.view";

export function normalizeAppRole(role: string | null | undefined): AppRole {
  const normalized = String(role ?? "").toLowerCase().trim();
  if (normalized === "admin") return "admin";
  if (normalized === "manager") return "manager";
  return "member";
}

export function isAdminRole(role: string | null | undefined): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === "admin" || normalized === "manager";
}

export function hasAdminCapability(
  role: string | null | undefined,
  _capability: AdminCapability,
): boolean {
  const normalized = normalizeAppRole(role);
  // Di layer UI foundation Batch 1, seluruh capability admin terbuka untuk role admin & manager.
  // Catatan: Ini adalah UI helper murni dan BUKAN pengganti otorisasi backend/API.
  return normalized === "admin" || normalized === "manager";
}

