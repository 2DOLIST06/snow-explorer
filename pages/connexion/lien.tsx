import Head from "next/head";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest, MemberApiError, type MemberSession } from "@/lib/memberApi";
import type { NewsletterIntent } from "@/lib/newsletter/onboarding";
export default function MemberLinkLogin() {
  const router = useRouter(); const { refresh, stageNewsletterIntent } = useMemberAuth();
  const [token, setToken] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [sent, setSent] = useState(false); const [needsEmail, setNeedsEmail] = useState(false); const [email, setEmail] = useState("");
  useEffect(() => { const value = window.location.hash.slice(1); if (value) setToken(value); else setNeedsEmail(true); window.history.replaceState(null, "", window.location.pathname); }, []);
  async function connect() {
    setBusy(true); setError("");
    try { const result = await memberRequest<MemberSession & { newsletter_intent?: NewsletterIntent | null }>("/login-link/consume", { token }); if (!await refresh()) throw new Error("Session non disponible. Vérifiez que les cookies de connexion sont autorisés."); stageNewsletterIntent(result.newsletter_intent || null, result.user.email); await router.replace("/mon-compte"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion impossible."); }
    finally { setBusy(false); }
  }
  async function resend(event?: FormEvent) {
    event?.preventDefault(); setBusy(true); setError(""); setSent(false);
    try {
      if (needsEmail) await memberRequest("/login-link", { email: email.trim().toLowerCase() });
      else await memberRequest("/login-link/resend", { token });
      setSent(true);
    } catch (cause) {
      if (cause instanceof MemberApiError && cause.code === "resend_email_required") { setNeedsEmail(true); setError("Cet ancien lien ne permet plus de retrouver le compte. Indiquez votre adresse email pour recevoir un nouveau lien."); }
      else setError(cause instanceof Error ? cause.message : "Impossible d’envoyer le lien. Réessayez.");
    } finally { setBusy(false); }
  }
  return <main className="admin-login"><Head><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Head><section className="admin-login-card"><h1>Accéder à mon compte</h1>
    {!sent && !needsEmail && <button className="btn btn--primary" disabled={busy || !token} onClick={() => void connect()}>{busy ? "Veuillez patienter…" : "Me connecter"}</button>}
    {error && <p role="alert">{error}</p>}
    {sent ? <p role="status">Un nouveau lien de connexion a été envoyé à l’adresse associée à votre compte. Vérifiez aussi vos courriers indésirables.</p> : needsEmail ? <form onSubmit={resend} className="newsletter-stack"><label>Adresse email<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label><button className="btn btn--primary" disabled={busy}>{busy ? "Envoi…" : "Envoyer un nouveau lien"}</button></form> : <p><button type="button" className="newsletter-change-email" disabled={busy} onClick={() => void resend()}>{busy ? "Envoi…" : "Recevoir un nouveau lien"}</button></p>}
    <p><Link href="/connexion?autre=1">Se connecter avec une autre adresse</Link></p>
  </section></main>;
}
