import { FormEvent, useEffect, useMemo, useState } from "react";
import StationSearch from "./StationSearch";
import { translator } from "@/lib/newsletter/i18n";
import type { NewsletterFrequency, WeatherFrequency, StationSummary, StationTopics, StationSettings, StationSettingsApi } from "@/types/newsletter";
import styles from "./StationNewsletterEditor.module.css";

export type { StationTopics, StationSettings, StationSettingsApi } from "@/types/newsletter";
const topics = [
  ["snowfall_enabled", "Chutes de neige", "Snowfall"], ["snow_conditions_enabled", "État de la neige", "Snow conditions"],
  ["weather_enabled", "Météo", "Weather"], ["resort_updates_enabled", "Actualités de la station", "Resort news"],
  ["articles_enabled", "Articles sur cette station", "Articles about this resort"],
  ["opening_closing_enabled", "Ouvertures et fermetures", "Opening and closing dates"],
  ["lift_updates_enabled", "Pistes et remontées", "Slopes and lifts"],
  ["ski_pass_updates_enabled", "Forfaits de ski", "Ski passes"],
] as const;

export default function StationNewsletterEditor({ api, locale = "fr" }: { api: StationSettingsApi; locale?: "fr" | "en" }) {
  const fr = locale === "fr"; const t = useMemo(() => translator(locale), [locale]);
  const [stations, setStations] = useState<StationSettings[]>([]); const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false); const [selected, setSelected] = useState<StationSummary[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [lastAdded, setLastAdded] = useState<string[]>([]);
  useEffect(() => { let live = true; setLoading(true); api.list().then(rows => { if (live) { setStations(rows); setAdding(rows.length === 0); } }).catch(() => { if (live) setError(fr ? "Impossible de charger vos stations. Réessayez." : "Unable to load your resorts. Please try again."); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [api, fr]);
  const followedIds = useMemo(() => new Set(stations.map(item => String(item.station.id))), [stations]);
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch { setError(fr ? "Impossible d’enregistrer cette modification. Réessayez." : "Unable to save this change. Please try again."); }
    finally { setBusy(false); }
  }
  async function add(event: FormEvent) {
    event.preventDefault(); if (!selected.length || busy) return;
    await action(async () => {
      setLastAdded([]);
      for (const station of selected) {
        const value = await api.add(station.id);
        setStations(old => old.some(item => String(item.station.id) === String(value.station.id))
          ? old.map(item => String(item.station.id) === String(value.station.id) ? value : item) : [...old, value]);
        setLastAdded(old => [...old, String(value.station.id)]);
        setSelected(old => old.filter(item => String(item.id) !== String(station.id)));
      }
      setAdding(false);
      setNotice(fr ? "Stations ajoutées. Choisissez les informations à recevoir pour chacune." : "Resorts added. Choose your updates for each one.");
    });
  }
  return <section className={styles.editor}>
    <p>{fr ? "Choisissez les stations pour lesquelles vous souhaitez recevoir des informations, puis personnalisez les thèmes et la fréquence pour chacune." : "Choose the resorts you want updates about, then set the topics and frequency for each one."}</p>
    {error && <p role="alert" className="newsletter-feedback newsletter-feedback--error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">{t("loading")}</p> : <>
      {!stations.length && <p>{fr ? "Vous n’avez pas encore choisi de station." : "You have not selected a resort yet."}</p>}
      {stations.map(item => <StationCard key={String(item.station.id)} value={item} fr={fr} busy={busy} newlyAdded={lastAdded.includes(String(item.station.id))} onSave={draft => action(async () => {
        const saved = await api.save(item.station.id, draft); setStations(old => old.map(row => String(row.station.id) === String(item.station.id) ? saved : row)); setNotice(t("saved"));
      })} onRemove={() => action(async () => { await api.remove(item.station.id); setStations(old => old.filter(row => String(row.station.id) !== String(item.station.id))); setNotice(t("removed")); })} />)}
      <details className={styles.add} open={adding} onToggle={event => setAdding(event.currentTarget.open)}><summary>{stations.length ? (fr ? "Rajouter une autre station" : "Add another resort") : (fr ? "Choisir mes stations" : "Choose my resorts")}</summary>{adding && <form onSubmit={add}>
        <StationSearch followedIds={followedIds} t={t} selected={selected} onChange={setSelected} disabled={busy} />
        <p role="status">{fr ? `${selected.length} station(s) sélectionnée(s)` : `${selected.length} resort(s) selected`}</p>
        <button className="btn btn--primary" disabled={!selected.length || busy}>{busy ? t("saving") : fr ? "Valider ma sélection" : "Confirm my selection"}</button>
      </form>}</details>
    </>}
  </section>;
}

function StationCard({ value, fr, busy, newlyAdded, onSave, onRemove }: { value: StationSettings; fr: boolean; busy: boolean; newlyAdded: boolean; onSave: (draft: StationTopics) => Promise<void>; onRemove: () => Promise<void> }) {
  const [open, setOpen] = useState(newlyAdded); const [draft, setDraft] = useState(value.preferences);
  useEffect(() => setDraft(value.preferences), [value]);
  useEffect(() => { if (newlyAdded) setOpen(true); }, [newlyAdded]);
  return <details className={styles.card} open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{value.station.name}<span className={styles.summary}>{topics.filter(([key]) => value.preferences[key]).map(([, label, english]) => fr ? label : english).join(" · ") || (fr ? "Aucune information activée" : "No updates enabled")}</span></summary>
    {value.station.is_active === false && <p>{fr ? "Cette station n’est actuellement plus proposée dans le catalogue." : "This resort is currently unavailable in the catalogue."}</p>}
    <form onSubmit={event => { event.preventDefault(); void onSave(draft); }}><div className="preference-grid">{topics.map(([key, label, english]) => <label className="preference-toggle" key={key}><span>{fr ? label : english}</span><input type="checkbox" checked={Boolean(draft[key])} onChange={event => { const checked = event.target.checked; setDraft(old => ({ ...old, [key]: checked, ...(key === "weather_enabled" && checked && old.weather_frequency === "disabled" ? { weather_frequency: "friday" as WeatherFrequency } : {}) })); }} disabled={busy} /></label>)}</div>
      {draft.weather_enabled && <label className="newsletter-field">{fr ? "Fréquence météo" : "Weather frequency"}<select value={draft.weather_frequency} disabled={busy} onChange={event => setDraft(old => ({ ...old, weather_frequency: event.target.value as WeatherFrequency }))}><option value="daily">{fr ? "Chaque jour" : "Daily"}</option><option value="friday">{fr ? "Chaque vendredi" : "Every Friday"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="disabled">{fr ? "En pause" : "Paused"}</option></select></label>}
      <label className="newsletter-field">{fr ? "Fréquence des autres informations" : "Other updates frequency"}<select value={draft.newsletter_frequency} onChange={event => setDraft(old => ({ ...old, newsletter_frequency: event.target.value as NewsletterFrequency }))} disabled={busy}>
        <option value="immediate">{fr ? "Dès qu’une information est disponible" : "As soon as an update is available"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="monthly">{fr ? "Chaque mois" : "Monthly"}</option>
      </select></label><div className={styles.actions}><button className="btn btn--primary" disabled={busy}>{fr ? "Enregistrer pour cette station" : "Save for this resort"}</button><button type="button" className="btn btn--secondary" disabled={busy} onClick={() => { const paused = { ...draft, ...Object.fromEntries(topics.map(([key]) => [key, false])), weather_frequency: "disabled" as WeatherFrequency }; setDraft(paused); void onSave(paused); }}>{fr ? "Tout mettre en pause" : "Pause all updates"}</button><button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void onRemove()}>{fr ? "Retirer cette station" : "Remove this resort"}</button></div>
    </form>
  </details>;
}
