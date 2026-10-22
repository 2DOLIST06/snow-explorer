import { useCallback, useEffect, useState } from "react";
import { memberRequest } from "@/lib/memberApi";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import type { NewsletterFrequency, NewsletterPreferences } from "@/types/newsletter";

type Access = { status: string };
const topics = [
  ["snow_conditions", "État de la neige"], ["snowfall", "Chutes de neige"], ["weather", "Météo"],
  ["resort_updates", "Actualités des stations"], ["opening_closing", "Ouvertures et fermetures"],
  ["lift_updates", "Remontées mécaniques"], ["ski_pass_updates", "Forfaits"], ["articles", "Nouveaux articles"],
] as const;
export default function MemberNewsletter() {
  const { user } = useMemberAuth(); const [access, setAccess] = useState<Access | null>(null);
  const [preferences, setPreferences] = useState<NewsletterPreferences | null>(null);
  const [frequency, setFrequency] = useState<NewsletterFrequency>("weekly");
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const next = await memberRequest<Access>("/newsletter/access");
    if (next.status === "active" || next.status === "pending") {
      const { data } = await memberRequest<{ data: { preferences: NewsletterPreferences & { newsletter_frequency: NewsletterFrequency }; newsletter_frequency: NewsletterFrequency } }>("/newsletter/preferences");
      setPreferences(data.preferences); setFrequency(data.newsletter_frequency || data.preferences.newsletter_frequency);
    } else setPreferences(null);
    setAccess(next);
  }, []);
  useEffect(() => { void load().catch(() => setError("Impossible de charger les préférences newsletter. Réessayez.")); }, [load]);
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }
  return <section className="newsletter-section"><h2>Préférences newsletter</h2>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!access ? <p>Chargement des préférences…</p> : (access.status === "active" || access.status === "pending") && preferences ? <>
      <form onSubmit={event => { event.preventDefault(); void action(async () => {
        await memberRequest("/newsletter/preferences", { ...preferences, newsletter_frequency: frequency }, true);
        setNotice("Préférences enregistrées.");
      }); }}><div className="preference-grid">{topics.map(([key, label]) => <label key={key} className="preference-toggle"><span>{label}</span><input type="checkbox" checked={Boolean(preferences[key])} onChange={event => setPreferences(old => old ? { ...old, [key]: event.target.checked } : old)} disabled={busy} /></label>)}</div>
      <label className="newsletter-field">Fréquence<select value={frequency} onChange={event => setFrequency(event.target.value as NewsletterFrequency)} disabled={busy}><option value="immediate">Dès qu’une information est disponible</option><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option></select></label><button className="btn btn--primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer mes préférences"}</button></form>
      <button className="btn btn--secondary" disabled={busy} onClick={() => void action(async () => { await memberRequest("/newsletter/unsubscribe", {}, true); setAccess({ status: "unsubscribed" }); setPreferences(null); setConsent(false); setNotice("Vous êtes désabonné de la newsletter."); })}>Me désabonner</button>
    </> : access.status === "bounced" || access.status === "complained" ? <p>Cet abonnement est indisponible. Contactez-nous pour le vérifier.</p> : <>
      <p>{access.status === "unsubscribed" ? "Vous êtes désabonné de la newsletter." : "Vous n’êtes pas inscrit à la newsletter."}</p>
      <label className="preference-toggle"><span>Je souhaite recevoir les informations et actualités de Snow Explorer par e-mail. Je pourrai me désabonner à tout moment.</span><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} /></label>
      <button className="btn btn--primary" disabled={!consent || busy} onClick={() => void action(async () => {
        await memberRequest("/newsletter/subscribe", { email: user?.email, consent: true, consentTextVersion: "v1", language: "fr", source: "member-account" }, true); await load();
      })}>{busy ? "Inscription…" : "M’inscrire à la newsletter"}</button>
    </>}
  </section>;
}
