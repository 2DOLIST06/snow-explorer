import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest, type MemberSession } from "@/lib/memberApi";
import type { NewsletterIntent } from "@/lib/newsletter/onboarding";
export default function MemberLinkLogin() {
  const router = useRouter(); const { refresh, stageNewsletterIntent } = useMemberAuth();
  const [token, setToken] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { const value = window.location.hash.slice(1); if (value) setToken(value); window.history.replaceState(null, "", window.location.pathname); }, []);
  async function connect() {
    setBusy(true); setError("");
    try { const result = await memberRequest<MemberSession & { newsletter_intent?: NewsletterIntent | null }>("/login-link/consume", { token }); if (!await refresh()) throw new Error("Session non disponible. Vérifiez que les cookies de connexion sont autorisés."); if (result.newsletter_intent) stageNewsletterIntent(result.newsletter_intent, result.user.email); await router.replace("/mon-compte"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible."); }
    finally { setBusy(false); }
  }
  return <main className="admin-login"><Head><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Head><section className="admin-login-card"><h1>Accéder à mon compte</h1><button className="btn btn--primary" disabled={busy || !token} onClick={() => void connect()}>{busy ? "Connexion…" : "Me connecter"}</button>{error && <p role="alert">{error}</p>}<p><Link href="/connexion">Recevoir un nouveau lien</Link></p><p><Link href="/inscription">Créer un compte</Link></p></section></main>;
}
