import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { newsletterApi, NewsletterApiError } from "@/lib/api/newsletter";
import { memberRequest } from "@/lib/memberApi";
import { newsletterLanguage, translator } from "@/lib/newsletter/i18n";

// Old preference tokens remain scoped to the newsletter. They can request an
// account access email, but never authenticate a full member account directly.
export default function NewsletterPreferences({ token }: { token: string }) {
  const router = useRouter(); const language = newsletterLanguage(router); const fr = language === "fr";
  const t = useMemo(() => translator(language), [language]);
  const [loading, setLoading] = useState(true); const [valid, setValid] = useState(false); const [unsubscribed, setUnsubscribed] = useState(false);
  const [confirmUnsubscribe, setConfirmUnsubscribe] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);
  useEffect(() => { if (router.query.action === "unsubscribe") setConfirmUnsubscribe(true); }, [router.query.action]);
  useEffect(() => { let live = true; setLoading(true); setError(""); newsletterApi.preferences(token).then(value => { if (live) { setValid(true); setUnsubscribed(value.unsubscribed || value.status === "unsubscribed"); } }).catch(cause => { if (live) setError(cause instanceof NewsletterApiError && [404, 410].includes(cause.status) ? "invalidToken" : "genericError"); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [token]);
  async function access() {
    setBusy(true); setError("");
    try { await memberRequest("/newsletter/account-link", { token }); setSent(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t("genericError")); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="newsletter-page"><p role="status">{t("loading")}</p></main>;
  return <main className="newsletter-page"><Head><meta name="referrer" content="no-referrer" /></Head>
    <header className="newsletter-hero"><h1>{confirmUnsubscribe ? t("unsubscribe") : (fr ? "Mon compte Snow Explorer" : "My Snow Explorer account")}</h1></header>
    {error && <p role="alert">{error === "invalidToken" ? t("invalidToken") : error === "genericError" ? t("genericError") : error}</p>}
    {valid && (confirmUnsubscribe ? <section className="newsletter-section newsletter-danger"><h2>{t("unsubscribe")}</h2>
      {unsubscribed ? <p role="status">{t("unsubscribeDone")}</p> : <><p>{t("unsubscribeConfirm")}</p><div><button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setConfirmUnsubscribe(false)}>{t("cancel")}</button> <button type="button" className="btn btn--primary" disabled={busy} onClick={async () => { setBusy(true); try { await newsletterApi.unsubscribe(token); setUnsubscribed(true); } catch { setError("genericError"); } finally { setBusy(false); } }}>{t("confirm")}</button></div></>}
    </section> : <section className="newsletter-section">
      <h2>{fr ? "Tous vos abonnements dans votre compte" : "All your subscriptions in your account"}</h2>
      <p>{fr ? "Votre compte Snow Explorer regroupe vos stations et vos préférences newsletter. Vous pouvez y accéder par lien email ou avec le mot de passe que vous avez défini." : "Your Snow Explorer account contains your resorts and newsletter preferences. Sign in by email link or with your password."}</p>
      <p>{fr ? (unsubscribed ? "Votre newsletter est désactivée. Vous pourrez retrouver vos réglages dans votre compte." : "Votre inscription newsletter est déjà active : la connexion sert uniquement à gérer votre compte.") : "Account sign-in is separate from newsletter activation."}</p>
      {sent ? <p role="status">{fr ? "Un lien d’accès à votre compte a été envoyé à l’adresse de cet abonnement." : "An account access link has been sent to the subscription email address."}</p> : <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void access()}>{busy ? t("saving") : (fr ? "Recevoir un lien pour accéder à mon compte" : "Email me an account access link")}</button>}
      <Link href="/connexion?method=password&autre=1">{fr ? "J’ai déjà défini un mot de passe : me connecter" : "I have a password: sign in"}</Link>
      {!unsubscribed && <button type="button" className="newsletter-change-email" onClick={() => setConfirmUnsubscribe(true)}>{t("unsubscribe")}</button>}
    </section>)}
  </main>;
}
