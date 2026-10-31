import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { memberRequest, MemberUser, MemberSession } from "@/lib/memberApi";
import type { NewsletterIntent } from "@/lib/newsletter/onboarding";

export type NewsletterAccountEntry = { email: string; intent: NewsletterIntent; draftToken: string | null; notice?: string; status: "active" | "already_subscribed"; expiresAt: number };
type State = { status: "loading" | "authenticated" | "unauthenticated"; user: MemberUser | null };
type Context = State & { newsletterEntry: NewsletterAccountEntry | null; openNewsletterAccount: (entry: NewsletterAccountEntry | null) => void; refresh: () => Promise<MemberUser | null>; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; newsletterIntent: NewsletterIntent | null; stageNewsletterIntent: (intent: NewsletterIntent | null, email: string) => void };
const MemberContext = createContext<Context | null>(null);
export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [state, setState] = useState<State>({ status: "loading", user: null });
  const [newsletterEntry, setNewsletterEntry] = useState<NewsletterAccountEntry | null>(null);
  const openNewsletterAccount = useCallback((entry: NewsletterAccountEntry | null) => {
    setNewsletterEntry(entry);
  }, []);
  useEffect(() => {
    if (!newsletterEntry) return;
    const remaining = newsletterEntry.expiresAt - Date.now();
    if (remaining <= 0) { openNewsletterAccount(null); return; }
    const timer = setTimeout(() => openNewsletterAccount(null), remaining);
    return () => clearTimeout(timer);
  }, [newsletterEntry, openNewsletterAccount]);
  const [staged, setStaged] = useState<{ email: string; intent: NewsletterIntent } | null>(null);
  const stageNewsletterIntent = useCallback((intent: NewsletterIntent | null, email: string) => {
    const next = intent ? { email, intent } : null;
    setStaged(next);
  }, []);
  const refresh = useCallback(async () => {
    try { const data = await memberRequest<MemberSession>("/session"); setState({ status: "authenticated", user: data.user }); return data.user; }
    catch { setState({ status: "unauthenticated", user: null }); return null; }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const login = useCallback(async (email: string, password: string) => {
    const data = await memberRequest<MemberSession>("/login", { email, password });
    openNewsletterAccount(null); setState({ status: "authenticated", user: data.user });
  }, [openNewsletterAccount]);
  const logout = useCallback(async () => {
    try { await memberRequest("/logout", {}, true); }
    catch (error) { if (!(error && typeof error === "object" && "status" in error && error.status === 401)) throw error; }
    openNewsletterAccount(null); stageNewsletterIntent(null, ""); setState({ status: "unauthenticated", user: null }); await router.push("/");
  }, [router, stageNewsletterIntent, openNewsletterAccount]);
  const newsletterIntent = staged?.email === state.user?.email ? staged?.intent ?? null : null;
  const value = useMemo(() => ({ ...state, refresh, login, logout, newsletterIntent, stageNewsletterIntent, newsletterEntry, openNewsletterAccount }), [state, refresh, login, logout, newsletterIntent, stageNewsletterIntent, newsletterEntry, openNewsletterAccount]);
  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}
export function useMemberAuth() { const value = useContext(MemberContext); if (!value) throw new Error("MemberAuthProvider is required"); return value; }
