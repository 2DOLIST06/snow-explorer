const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SKI_API_BASE || "http://127.0.0.1:5001";

export const ADMIN_API_BASE = configuredApiUrl.replace(/\/+$/, "");

type AuthHandlers = {
  getCsrfToken: () => string | null;
  refreshSession: () => Promise<string | null>;
  onExpired: () => void;
};

let handlers: AuthHandlers | null = null;
export const getAdminCsrfToken = () => handlers?.getCsrfToken() || null;
export const notifyAdminExpired = () => handlers?.onExpired();
export const refreshAdminSession = () => handlers?.refreshSession() || Promise.resolve(null);

export function registerAdminAuthHandlers(next: AuthHandlers | null) {
  handlers = next;
}

export class AdminApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const isReadMethod = (method: string) => ["GET", "HEAD", "OPTIONS"].includes(method);

function debugAdminRequest(method: string, url: string, csrfAttached: boolean) {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[adminApi] request", { method, url, credentials: "include", csrfAttached });
}

export async function adminFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  if (!path.startsWith("/api/") || path.startsWith("//")) throw new Error("adminFetch only accepts internal API paths");
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!isReadMethod(method)) {
    let csrf = handlers?.getCsrfToken();
    if (!csrf && handlers) csrf = await handlers.refreshSession();
    if (!csrf) throw new AdminApiError(0, `Jeton CSRF indisponible avant ${method} ${ADMIN_API_BASE}${path}`);
    headers.set("X-CSRF-Token", csrf);
  }
  const url = `${ADMIN_API_BASE}${path}`;
  debugAdminRequest(method, url, headers.has("X-CSRF-Token"));
  const response = await fetch(url, { ...init, method, headers, credentials: "include" });
  if (response.status === 401) handlers?.onExpired();
  const csrfFailure = response.status === 403 && !isReadMethod(method) && await response.clone().json().then(body => String(body?.code || body?.error || "").toLowerCase().includes("csrf")).catch(() => response.headers.get("X-CSRF-Error") === "1");
  if (csrfFailure && !retried && handlers) {
    const csrf = await handlers.refreshSession();
    if (csrf) return adminFetch(path, init, true);
  }
  if (csrfFailure && retried) handlers?.onExpired();
  return response;
}

export async function requireAdminResponse(path: string, init?: RequestInit): Promise<Response> {
  const response = await adminFetch(path, init);
  if (response.ok) return response;
  if (response.status === 403) throw new AdminApiError(403, "Vous n’avez pas l’autorisation d’accéder à cette ressource.");
  if (response.status === 401) throw new AdminApiError(401, "Votre session a expiré. Reconnectez-vous.");
  throw new AdminApiError(response.status, "Une erreur serveur est survenue.");
}
