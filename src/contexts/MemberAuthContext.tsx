import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { memberRequest, MemberUser, MemberSession } from "@/lib/memberApi";

type State = { status: "loading" | "authenticated" | "unauthenticated"; user: MemberUser | null };
type Context = State & { refresh: () => Promise<MemberUser | null>; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };
const MemberContext = createContext<Context | null>(null);
export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [state, setState] = useState<State>({ status: "loading", user: null });
  const refresh = useCallback(async () => {
    try { const data = await memberRequest<MemberSession>("/session"); setState({ status: "authenticated", user: data.user }); return data.user; }
    catch { setState({ status: "unauthenticated", user: null }); return null; }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const login = useCallback(async (email: string, password: string) => {
    const data = await memberRequest<MemberSession>("/login", { email, password });
    setState({ status: "authenticated", user: data.user });
  }, []);
  const logout = useCallback(async () => {
    try { await memberRequest("/logout", {}, true); }
    catch (error) { if (!(error && typeof error === "object" && "status" in error && error.status === 401)) throw error; }
    setState({ status: "unauthenticated", user: null }); await router.push("/");
  }, [router]);
  const value = useMemo(() => ({ ...state, refresh, login, logout }), [state, refresh, login, logout]);
  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}
export function useMemberAuth() { const value = useContext(MemberContext); if (!value) throw new Error("MemberAuthProvider is required"); return value; }
