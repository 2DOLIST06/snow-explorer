import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest } from "@/lib/memberApi";
import styles from "./StationNewsletterEditor.module.css";
import { accountNewsletterHref, type NewsletterIntent } from "@/lib/newsletter/onboarding";

type SignupResult = { status: "active" | "already_subscribed"; draft_token?: string | null; email_sent?: boolean; intent?: NewsletterIntent };
export default function NewsletterEnrollment({ initial, forceOtherEmail = false, fullPreferences = false }: { initial: NewsletterIntent; forceOtherEmail?: boolean; fullPreferences?: boolean }) {
  const router = useRouter(); const { user, stageNewsletterIntent, openNewsletterAccount } = useMemberAuth();
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [otherEmail, setOtherEmail] = useState(forceOtherEmail); const inputRef = useRef<HTMLInputElement>(null);
  const activeUser = otherEmail ? null : user;
  const fr = initial.language === "fr"; const station = initial.stations[0];
  const intent = { ...initial, consent: true };
  const baseLoginHref = station ? `/connexion?${accountNewsletterHref(station.station_id, station.station_name, station.topics[0]).split("?")[1]}` : "/connexion";
  const loginHref = `${baseLoginHref}${baseLoginHref.includes("?") ? "&" : "?"}method=password${otherEmail ? "&autre=1" : ""}`;
  function changeEmail() { setOtherEmail(true); setError(""); setEmail(""); if (typeof window !== "undefined") window.requestAnimationFrame(() => inputRef.current?.focus()); }
  async function enroll(choices: NewsletterIntent) {
    const selection = { ...choices, consent: true };
    setError(""); setBusy(true);
    try {
      if (activeUser) {
        await memberRequest("/newsletter/apply", { intent: selection }, true); stageNewsletterIntent(null, activeUser.email);
        openNewsletterAccount({ email: activeUser.email, intent: selection, draftToken: null, status: "active", expiresAt: Date.now() + 15 * 60 * 1000 });
      } else {
        const result = await memberRequest<SignupResult>("/newsletter/start", { email, intent: selection });
        if (result.status === "already_subscribed") stageNewsletterIntent(selection, email.trim().toLowerCase());
        openNewsletterAccount({ email: email.trim().toLowerCase(), intent: result.intent || selection, draftToken: result.draft_token || null, status: result.status, expiresAt: Date.now() + 15 * 60 * 1000 });
      }
      const selected = selection.stations.find(row => row.topics.length > 0);
      await router.push(selected ? accountNewsletterHref(selected.station_id, selected.station_name, selected.topics[0]) : "/mon-compte");
    } finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await enroll(intent); } catch (cause) { setError(cause instanceof Error ? cause.message : "Inscription impossible."); }
  }
  const emailField = activeUser ? <div><p>{activeUser.email}</p><button type="button" className="newsletter-change-email" disabled={busy} onClick={changeEmail}>{fr ? "Utiliser une autre adresse email" : "Use another email address"}</button></div> : <label className="newsletter-field"><span>{fr ? "Adresse email" : "Email address"}{fullPreferences && <span className={styles.required} aria-hidden="true"> *</span>}</span><input ref={inputRef} required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>;
  return <form onSubmit={submit} className="newsletter-stack">
    {fullPreferences && <p className={styles.emailPrompt}>{fr ? "Renseignez votre adresse email pour recevoir les informations demandées. Vous pourrez ensuite personnaliser vos abonnements." : "Enter your email to receive the requested updates. You can then customize your subscriptions."}</p>}
    {emailField}
    {!fullPreferences && station && <p><strong>{station.station_name}</strong> · {station.topics.includes("weather") ? (fr ? "Météo chaque vendredi, fréquence modifiable ensuite." : "Weather every Friday. You can change this later.") : (fr ? "Les informations sélectionnées pour cette station." : "Selected updates for this resort.")}</p>}
    <p className="newsletter-consent-note">{fr ? (fullPreferences ? "En cliquant sur « Valider », vous vous inscrivez aux emails Snow Explorer demandés. Vous pourrez personnaliser vos choix ou vous désinscrire à tout moment." : station ? "En cliquant ci-dessous, vous demandez à recevoir par email les informations sélectionnées pour cette station. Désinscription à tout moment." : "En cliquant ci-dessous, vous vous abonnez aux articles et guides Snow Explorer par email. Désinscription à tout moment.") : "By clicking below, you subscribe to the selected Snow Explorer emails. You can unsubscribe at any time."} <Link href="/confidentialite">{fr ? "Confidentialité" : "Privacy"}</Link></p>
    {error && <p role="alert">{error}</p>}
    <button className={`btn btn--primary${fullPreferences ? ` ${styles.signupButton}` : ""}`} disabled={busy}>{busy ? (fr ? "Enregistrement…" : "Saving…") : fullPreferences ? (fr ? "Valider" : "Confirm") : activeUser ? (fr ? "M’abonner et gérer mes préférences" : "Subscribe and manage preferences") : station ? (fr ? "M’abonner à ces informations par email" : "Subscribe to these email updates") : (fr ? "M’inscrire à la newsletter" : "Subscribe to the newsletter")}</button>
    {!activeUser && <p><Link href={loginHref}>{fr ? "Déjà un compte ? Se connecter" : "Already have an account? Sign in"}</Link></p>}
  </form>;
}
