import { ADMIN_API_BASE, adminFetch, registerAdminAuthHandlers } from "@/lib/adminApi";
import { DEFAULT_ADMIN_PATH, safeAdminNext } from "@/lib/adminRedirect";
import { useRouter } from "next/router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type AdminUser = { id: number | string; email: string; role: string };
export type AdminAuthState = { status: "loading" | "authenticated" | "unauthenticated"; user: AdminUser | null; csrfToken: string | null };
type Context = AdminAuthState & { login: (email: string, password: string) => Promise<void>; logout: (all?: boolean) => Promise<void>; refreshSession: () => Promise<string | null> };
const AdminAuthContext = createContext<Context | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AdminAuthState>({ status: "loading", user: null, csrfToken: null });
  const stateRef = useRef(state); stateRef.current = state;
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE}/api/admin/auth/session`, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) { setState({ status: "unauthenticated", user: null, csrfToken: null }); return null; }
      const data = await response.json();
      if (!data.authenticated || !data.user) { setState({ status: "unauthenticated", user: null, csrfToken: null }); return null; }
      setState({ status: "authenticated", user: data.user, csrfToken: data.csrf_token || null });
      return data.csrf_token || null;
    } catch {
      setState({ status: "unauthenticated", user: null, csrfToken: null });
      return null;
    }
  }, []);

  // Check the session on public pages too, so authenticated administrators can
  // access contextual editing actions without exposing them to other visitors.
  useEffect(() => { void refreshSession(); }, [refreshSession]);
  useEffect(() => registerAdminAuthHandlers({
    getCsrfToken: () => stateRef.current.csrfToken,
    refreshSession,
    onExpired: () => { const hadSession = stateRef.current.status === "authenticated"; setState({ status: "unauthenticated", user: null, csrfToken: null }); if (hadSession) void router.replace("/admin/login?reason=expired"); },
  }), [refreshSession, router]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${ADMIN_API_BASE}/api/admin/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, password }) });
    if (!response.ok) throw new Error(response.status === 429 ? "rate_limited" : "invalid_credentials");
    const data = await response.json();
    if (!data.authenticated || !data.user) throw new Error("invalid_credentials");
    setState({ status: "authenticated", user: data.user, csrfToken: data.csrf_token || null });
  }, []);
  const logout = useCallback(async (all = false) => {
    try { await adminFetch(`/api/admin/auth/${all ? "logout-all" : "logout"}`, { method: "POST" }); }
    finally { setState({ status: "unauthenticated", user: null, csrfToken: null }); await router.replace("/admin/login"); }
  }, [router]);
  const value = useMemo(() => ({ ...state, login, logout, refreshSession }), [state, login, logout, refreshSession]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() { const value = useContext(AdminAuthContext); if (!value) throw new Error("useAdminAuth must be used inside AdminAuthProvider"); return value; }

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const auth = useAdminAuth(); const router = useRouter(); const loginPage = router.pathname === "/admin/login";
  useEffect(() => {
    if (auth.status === "unauthenticated" && !loginPage) { const next = safeAdminNext(router.asPath); void router.replace(`/admin/login?next=${encodeURIComponent(next)}`); }
    if (auth.status === "authenticated" && loginPage) void router.replace(safeAdminNext(router.query.next) || DEFAULT_ADMIN_PATH);
  }, [auth.status, loginPage, router]);
  if (auth.status === "loading" || (auth.status === "unauthenticated" && !loginPage) || (auth.status === "authenticated" && loginPage)) return <main className="admin-auth-loading" aria-live="polite">Vérification de la session…</main>;
  return <>{children}</>;
}
