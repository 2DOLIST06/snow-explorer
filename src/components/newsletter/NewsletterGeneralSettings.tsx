import { useEffect, useState } from "react";
import { newsletterApi } from "@/lib/api/newsletter";
import type { NewsletterPreferencesUpdate, NewsletterFrequency } from "@/types/newsletter";

export default function NewsletterGeneralSettings({ token, locale }: { token: string; locale: "fr" | "en" }) {
  const [preferences, setPreferences] = useState<NewsletterPreferencesUpdate | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const fr = locale === "fr";
  useEffect(() => { let live = true; newsletterApi.preferences(token).then(result => { if (live) setPreferences(result.preferences); }).catch(() => { if (live) setError(fr ? "Impossible de charger les préférences des articles." : "Unable to load article preferences."); }); return () => { live = false; }; }, [token, fr]);
  return <section className="newsletter-section"><h2>{fr ? "Articles et guides, toutes destinations" : "Articles and guides, all destinations"}</h2>
    {error && <p role="alert">{error}</p>}{saved && <p role="status">{fr ? "Préférences enregistrées." : "Preferences saved."}</p>}
    {preferences && <form className="newsletter-stack" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); setSaved(false); try { await newsletterApi.updatePreferences(token, preferences); setSaved(true); } catch { setError(fr ? "Enregistrement impossible. Réessayez." : "Unable to save. Please try again."); } finally { setBusy(false); } }}>
      <label className="preference-toggle"><span>{fr ? "Recevoir les nouveaux articles et guides Snow Explorer" : "Receive new Snow Explorer articles and guides"}</span><input type="checkbox" checked={preferences.articles} disabled={busy} onChange={event => setPreferences({ ...preferences, articles: event.target.checked })} /></label>
      <label className="newsletter-field">{fr ? "Fréquence" : "Frequency"}<select value={preferences.newsletter_frequency} disabled={busy} onChange={event => setPreferences({ ...preferences, newsletter_frequency: event.target.value as NewsletterFrequency })}><option value="immediate">{fr ? "À chaque publication" : "On publication"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="monthly">{fr ? "Chaque mois" : "Monthly"}</option></select></label>
      <button className="btn btn--primary" disabled={busy}>{fr ? "Enregistrer" : "Save"}</button>
    </form>}
  </section>;
}
