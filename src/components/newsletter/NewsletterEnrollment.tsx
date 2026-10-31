import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { memberRequest } from "@/lib/memberApi";
import { accountNewsletterHref, type NewsletterIntent } from "@/lib/newsletter/onboarding";
import NewsletterIntentForm from "./NewsletterIntentForm";

export default function NewsletterEnrollment({ initial }: { initial: NewsletterIntent }) {
  const router = useRouter(); const { user, stageNewsletterIntent } = useMemberAuth();
  const [email, setEmail] = useState(""); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [draftToken, setDraftToken] = useState(""); const [saved, setSaved] = useState(false);
  const fr = initial.language === "fr";
  const station = initial.stations[0];
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!consent) return;
    setBusy(true);
    try {
      const intent = { ...initial, consent: true };
      if (user) { stageNewsletterIntent(intent, user.email); await router.push("/mon-compte"); }
      else { const result = await memberRequest<{ draft_token: string }>("/newsletter/start", { email, intent }); setDraftToken(result.draft_token); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Inscription impossible."); }
    finally { setBusy(false); }
  }
  if (draftToken) return <div className="newsletter-customization">
    <p role="status" className="newsletter-feedback newsletter-feedback--success">{fr ? "Votre demande est enregistrée. Un lien pour confirmer votre adresse et retrouver vos abonnements vous a été envoyé." : "Your request is saved. Check your email for a link to verify your address and access your subscriptions."}</p>
    <h3>{fr ? "Personnalisez vos choix maintenant, si vous le souhaitez" : "Personalize your choices now, if you wish"}</h3>
    <p>{fr ? "Cette étape est facultative. Vos choix seront conservés jusqu’à votre connexion par le lien reçu." : "This step is optional. Your choices will be kept until you sign in using the email link."}</p>
    {saved && <p role="status">{fr ? "Vos choix sont enregistrés. Utilisez le lien reçu pour les confirmer dans votre compte." : "Your choices are saved. Use the email link to confirm them in your account."}</p>}
    <NewsletterIntentForm initial={{ ...initial, consent: true }} onSave={async intent => { setSaved(false); await memberRequest("/newsletter/draft", { draft_token: draftToken, intent }); setSaved(true); }} />
    <p><Link href="/connexion">{fr ? "Se connecter avec un mot de passe" : "Sign in with a password"}</Link></p>
  </div>;
  return <form onSubmit={submit} className="newsletter-stack">
    {user ? <p>{user.email}</p> : <label><span>{fr ? "Adresse email" : "Email address"}</span><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>}
    {station && <p><strong>{station.station_name}</strong> · {station.topics.includes("weather") ? (fr ? "Météo, chaque vendredi par défaut. Fréquence modifiable à l’étape suivante." : "Weather, every Friday by default. You can change the frequency in the next step.") : (fr ? "Le thème choisi sera présélectionné dans vos préférences." : "Your selected topic will be preselected in your preferences.")}</p>}
    <label className="newsletter-check"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} /><span>{fr ? (station ? "Je souhaite recevoir les informations sélectionnées pour cette station par email. Je pourrai me désabonner à tout moment." : "Je souhaite recevoir les articles et guides Snow Explorer par email. Je pourrai choisir des stations et me désabonner à tout moment.") : "I agree to receive the selected Snow Explorer updates by email. I can unsubscribe at any time."}</span></label>
    {error && <p role="alert">{error}</p>}
    <button className="btn btn--primary" disabled={busy}>{busy ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "M’inscrire et personnaliser" : "Sign up and personalize")}</button>
    {!user && <p><Link href={station ? `/connexion?${accountNewsletterHref(station.station_id, station.station_name, station.topics[0]).split("?")[1]}` : "/connexion"}>{fr ? "Déjà un compte ? Se connecter" : "Already have an account? Sign in"}</Link></p>}
  </form>;
}
