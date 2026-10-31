import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest } from "@/lib/memberApi";
import { accountNewsletterHref, type NewsletterIntent } from "@/lib/newsletter/onboarding";
import NewsletterIntentForm from "./NewsletterIntentForm";

type SignupResult = { status: "active" | "already_subscribed"; draft_token?: string | null; email_sent?: boolean };
export default function NewsletterEnrollment({ initial }: { initial: NewsletterIntent }) {
  const router = useRouter(); const { user, stageNewsletterIntent } = useMemberAuth();
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [otherEmail, setOtherEmail] = useState(false); const inputRef = useRef<HTMLInputElement>(null);
  const activeUser = otherEmail ? null : user;
  const [result, setResult] = useState<SignupResult | null>(null); const [loginSent, setLoginSent] = useState(false);
  const fr = initial.language === "fr"; const station = initial.stations[0];
  const intent = { ...initial, consent: true };
  const baseLoginHref = station ? `/connexion?${accountNewsletterHref(station.station_id, station.station_name, station.topics[0]).split("?")[1]}` : "/connexion";
  const loginHref = `${baseLoginHref}${baseLoginHref.includes("?") ? "&" : "?"}method=password${otherEmail ? "&autre=1" : ""}`;
  function changeEmail() { setOtherEmail(true); setResult(null); setLoginSent(false); setError(""); setEmail(""); if (typeof window !== "undefined") window.requestAnimationFrame(() => inputRef.current?.focus()); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      if (activeUser) { await memberRequest("/newsletter/apply", { intent }, true); stageNewsletterIntent(null, activeUser.email); await router.push("/mon-compte"); }
      else setResult(await memberRequest<SignupResult>("/newsletter/start", { email, intent }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Inscription impossible."); }
    finally { setBusy(false); }
  }
  async function requestAccess() {
    setBusy(true); setError("");
    try { await memberRequest("/newsletter/login-link", { email, intent }); setLoginSent(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Envoi impossible."); }
    finally { setBusy(false); }
  }
  if (result) return <div className="newsletter-customization">
    <p className="newsletter-used-email">{fr ? "Adresse utilisée : " : "Email used: "}<strong>{email.trim().toLowerCase()}</strong></p>
    <p role="status" className="newsletter-feedback newsletter-feedback--success">{result.status === "already_subscribed" ? (fr ? "Cette adresse est déjà inscrite à la newsletter. Vos abonnements ont été conservés." : "This email is already subscribed. Your subscriptions have been kept.") : (fr ? "Vous êtes inscrit à la newsletter. Aucune validation par email n’est nécessaire." : "You are subscribed. No email confirmation is needed.")}</p>
    {result.draft_token && <><h3>{fr ? "Personnalisez vos abonnements, si vous le souhaitez" : "Personalize your subscriptions, if you wish"}</h3><p>{fr ? "Votre inscription est déjà active. Cette étape est facultative." : "Your subscription is already active. This step is optional."}</p><NewsletterIntentForm initial={intent} onSave={async choices => { await memberRequest("/newsletter/draft", { draft_token: result.draft_token, intent: choices }); }} /></>}
    {!result.draft_token && <p>{fr ? "Pour retrouver ou modifier vos stations, accédez à vos abonnements." : "Access your subscriptions to view or edit your resorts."}</p>}
    {error && <p role="alert">{error}</p>}
    {loginSent ? <p role="status">{fr ? "Un lien d’accès à vos réglages a été envoyé. Votre inscription à la newsletter est déjà active." : "An access link has been sent. Your newsletter subscription is already active."}</p> : <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void requestAccess()}>{busy ? (fr ? "Envoi…" : "Sending…") : (fr ? "Recevoir un lien pour accéder à mon compte" : "Email me an account access link")}</button>}
    <p><Link href={loginHref}>{fr ? "J’ai déjà défini un mot de passe : me connecter" : "Sign in with a password"}</Link></p>
    <button type="button" className="newsletter-change-email" disabled={busy} onClick={changeEmail}>{fr ? "Inscrire une autre adresse email" : "Subscribe another email address"}</button>
  </div>;
  return <form onSubmit={submit} className="newsletter-stack">
    {activeUser ? <div><p>{activeUser.email}</p><button type="button" className="newsletter-change-email" disabled={busy} onClick={changeEmail}>{fr ? "Utiliser une autre adresse email" : "Use another email address"}</button></div> : <label><span>{fr ? "Adresse email" : "Email address"}</span><input ref={inputRef} required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>}
    {station && <p><strong>{station.station_name}</strong> · {station.topics.includes("weather") ? (fr ? "Météo chaque vendredi, fréquence modifiable ensuite." : "Weather every Friday. You can change this later.") : (fr ? "Les informations sélectionnées pour cette station." : "Selected updates for this resort.")}</p>}
    <p className="newsletter-consent-note">{fr ? (station ? "En cliquant ci-dessous, vous demandez à recevoir par email les informations sélectionnées pour cette station. Désinscription à tout moment." : "En cliquant ci-dessous, vous vous abonnez aux articles et guides Snow Explorer par email. Désinscription à tout moment.") : "By clicking below, you subscribe to the selected Snow Explorer emails. You can unsubscribe at any time."} <Link href="/confidentialite">{fr ? "Confidentialité" : "Privacy"}</Link></p>
    {error && <p role="alert">{error}</p>}
    <button className="btn btn--primary" disabled={busy}>{busy ? (fr ? "Enregistrement…" : "Saving…") : activeUser ? (fr ? "M’abonner et gérer mes préférences" : "Subscribe and manage preferences") : station ? (fr ? "M’abonner à ces informations par email" : "Subscribe to these email updates") : (fr ? "M’inscrire à la newsletter" : "Subscribe to the newsletter")}</button>
    {!activeUser && <p><Link href={loginHref}>{fr ? "Déjà un compte ? Se connecter" : "Already have an account? Sign in"}</Link></p>}
  </form>;
}
