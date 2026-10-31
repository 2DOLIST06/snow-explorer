import { FormEvent, useMemo, useState } from "react";
import StationSearch from "./StationSearch";
import { newsletterTopics, stationIntent, type NewsletterIntent } from "@/lib/newsletter/onboarding";
import { translator } from "@/lib/newsletter/i18n";
import type { NewsletterFrequency, StationSummary, WeatherFrequency } from "@/types/newsletter";
import styles from "./StationNewsletterEditor.module.css";

type Props = { initial: NewsletterIntent; onSave: (intent: NewsletterIntent) => Promise<void>; submitLabel?: string; onCancel?: () => void };
export default function NewsletterIntentForm({ initial, onSave, submitLabel, onCancel }: Props) {
  const [draft, setDraft] = useState(initial);
  const [selected, setSelected] = useState<StationSummary[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const fr = draft.language === "fr"; const t = useMemo(() => translator(draft.language), [draft.language]);
  const followed = useMemo(() => new Set(draft.stations.map(row => String(row.station_id))), [draft.stations]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    if (draft.stations.some(row => row.topics.length === 0)) { setError(fr ? "Choisissez au moins un thème par station ou retirez la station." : "Choose at least one topic per resort or remove the resort."); return; }
    setBusy(true);
    try { await onSave(draft); } catch (cause) { setError(cause instanceof Error ? cause.message : t("genericError")); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className={styles.editor}>
    <p>{fr ? "Choisissez uniquement ce qui vous intéresse. Vous pourrez modifier vos choix à tout moment dans Mes abonnements." : "Choose what interests you. You can change your subscriptions at any time."}</p>
    <label className="preference-toggle"><span>{fr ? "Articles et guides Snow Explorer, toutes destinations" : "Snow Explorer articles and guides, all destinations"}</span><input type="checkbox" checked={draft.articles === true} disabled={busy} onChange={event => setDraft(old => ({ ...old, articles: event.target.checked }))} /></label>
    {draft.stations.map((row, index) => <fieldset className={styles.card} key={String(row.station_id)} disabled={busy}>
      <legend>{row.station_name}</legend>
      <div className="preference-grid">{newsletterTopics.map(topic => <label className="preference-toggle" key={topic.key}><span>{fr ? topic.fr : topic.en}</span><input type="checkbox" checked={row.topics.includes(topic.key)} onChange={event => { const checked = event.target.checked; setDraft(old => ({ ...old, stations: old.stations.map((item, i) => i === index ? { ...item, topics: checked ? [...item.topics, topic.key] : item.topics.filter(key => key !== topic.key) } : item) })); }} /></label>)}</div>
      {row.topics.includes("weather") && <label className="newsletter-field">{fr ? "Fréquence météo" : "Weather frequency"}<select value={row.weather_frequency} onChange={event => setDraft(old => ({ ...old, stations: old.stations.map((item, i) => i === index ? { ...item, weather_frequency: event.target.value as WeatherFrequency } : item) }))}><option value="daily">{fr ? "Chaque jour" : "Daily"}</option><option value="friday">{fr ? "Chaque vendredi" : "Every Friday"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option></select></label>}
      {row.topics.some(topic => topic !== "weather") && <label className="newsletter-field">{fr ? "Fréquence des autres informations" : "Other updates frequency"}<select value={row.newsletter_frequency} onChange={event => setDraft(old => ({ ...old, stations: old.stations.map((item, i) => i === index ? { ...item, newsletter_frequency: event.target.value as NewsletterFrequency } : item) }))}><option value="immediate">{fr ? "À chaque nouvelle information" : "When an update is available"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="monthly">{fr ? "Chaque mois" : "Monthly"}</option></select></label>}
      <button type="button" className="btn btn--secondary" onClick={() => setDraft(old => ({ ...old, stations: old.stations.filter((_, i) => i !== index) }))}>{fr ? "Retirer cette station" : "Remove this resort"}</button>
    </fieldset>)}
    {draft.stations.length < 20 && <details className={styles.add}><summary>{fr ? "Ajouter une station" : "Add a resort"}</summary>
      <StationSearch followedIds={followed} selected={selected} onChange={setSelected} disabled={busy} t={t} />
      <button type="button" className="btn btn--secondary" disabled={busy || !selected.length || selected.length + draft.stations.length > 20} onClick={() => { setDraft(old => ({ ...old, stations: [...old.stations, ...selected.map(item => stationIntent(item.id, item.name, "resort_updates"))] })); setSelected([]); }}>{fr ? "Ajouter les stations sélectionnées" : "Add selected resorts"}</button>
    </details>}
    {error && <p role="alert">{error}</p>}
    <div className={styles.actions}><button className="btn btn--primary" disabled={busy}>{busy ? t("saving") : submitLabel || (fr ? "Enregistrer mes choix" : "Save my choices")}</button>{onCancel && <button type="button" className="btn btn--secondary" disabled={busy} onClick={onCancel}>{fr ? "Annuler cet ajout" : "Cancel this addition"}</button>}</div>
  </form>;
}
