export const DEFAULT_ADMIN_PATH = "/admin/stations";

export function safeAdminNext(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/admin/") || value.startsWith("//") || value === "/admin/login") {
    return DEFAULT_ADMIN_PATH;
  }
  try {
    const parsed = new URL(value, "https://internal.invalid");
    return parsed.origin === "https://internal.invalid" && parsed.pathname.startsWith("/admin/") ? `${parsed.pathname}${parsed.search}${parsed.hash}` : DEFAULT_ADMIN_PATH;
  } catch { return DEFAULT_ADMIN_PATH; }
}
