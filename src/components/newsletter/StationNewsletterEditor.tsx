import { FormEvent, useEffect, useMemo, useState } from "react";
import StationSearch from "./StationSearch";
import { translator } from "@/lib/newsletter/i18n";
import type { NewsletterFrequency, StationSummary, StationTopics, StationSettings, StationSettingsApi } from "@/types/newsletter";
import styles from "./StationNewsletterEditor.module.css";

export type { StationTopics, StationSettings, StationSettingsApi } from "@/types/newsletter";
const topics = [
  ["snowfall_enabled", "Chutes de neige", "Snowfall"], ["snow_conditions_enabled", "État de la neige", "Snow conditions"],
  ["weather_enabled", "Météo", "Weather"], ["resort_updates_enabled", "Actualités de la station", "Resort news"],
  ["articles_enabled", "Nouveaux articles", "New articles"],
] as const;

export default function StationNewsletterEditor({ api, locale = "fr" }: { api: StationSettingsApi; locale?: "fr" | "en" }) {
  const fr = locale === "fr"; const t = useMemo(() => translator(locale), [locale]);
  const [stations, setStations] = useState<StationSettings[]>([]); const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false); const [selected, setSelected] = useState<StationSummary | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  useEffect(() => { let live = true; setLoading(true); api.list().then(rows => { if (live) { setStations(rows); setAdding(rows.length === 0); } }).catch(() => { if (live) setError(fr ? "Impossible de charger vos stations. Réessayez." : "Unable to load your resorts. Please try again."); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [api, fr]);
  const followedIds = useMemo(() => new Set(stations.map(item => String(item.station.id))), [stations]);
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch { setError(fr ? "Impossible d’enregistrer cette modification. Réessayez." : "Unable to save this change. Please try again."); }
    finally { setBusy(false); }
  }
  async function add(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    await action(async () => {
      const value = await api.add(selected.id);
      setStations(old => followedIds.has(String(value.station.id)) ? old.map(item => String(item.station.id) === String(value.station.id) ? value : item) : [...old, value]);
      setLastAdded(String(value.station.id)); setSelected(null); setAdding(false);
      setNotice(fr ? "Station ajoutée. Choisissez les informations à recevoir ci-dessous." : "Resort added. Choose your updates below.");
    });
  }
  return <section className={styles.editor}>
    <p>{fr ? "Choisissez les stations pour lesquelles vous souhaitez recevoir des informations, puis personnalisez les thèmes et la fréquence pour chacune." : "Choose the resorts you want updates about, then set the topics and frequency for each one."}</p>
    {error && <p role="alert" className="newsletter-feedback newsletter-feedback--error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">{t("loading")}</p> : <>
      {!stations.length && <p>{fr ? "Vous n’avez pas encore choisi de station." : "You have not selected a resort yet."}</p>}
      {stations.map(item => <StationCard key={String(item.station.id)} value={item} fr={fr} busy={busy} newlyAdded={lastAdded === String(item.station.id)} onSave={draft => action(async () => {
        const saved = await api.save(item.station.id, draft); setStations(old => old.map(row => String(row.station.id) === String(item.station.id) ? saved : row)); setNotice(t("saved"));
      })} onRemove={() => action(async () => { await api.remove(item.station.id); setStations(old => old.filter(row => String(row.station.id) !== String(item.station.id))); setNotice(t("removed")); })} />)}
      <details className={styles.add} open={adding} onToggle={event => setAdding(event.currentTarget.open)}><summary>{t("addStation")}</summary>{adding && <form onSubmit={add}>
        <StationSearch followedIds={followedIds} t={t} onSelect={async station => { setSelected(station); }} />
        {selected && <p>{fr ? "Station sélectionnée :" : "Selected resort:"} <strong>{selected.name}</strong></p>}
        <button className="btn btn--primary" disabled={!selected || busy}>{busy ? t("saving") : fr ? "Valider cette station" : "Add this resort"}</button>
      </form>}</details>
    </>}
  </section>;
}

function StationCard({ value, fr, busy, newlyAdded, onSave, onRemove }: { value: StationSettings; fr: boolean; busy: boolean; newlyAdded: boolean; onSave: (draft: StationTopics) => Promise<void>; onRemove: () => Promise<void> }) {
  const [open, setOpen] = useState(newlyAdded); const [draft, setDraft] = useState(value.preferences);
  useEffect(() => setDraft(value.preferences), [value]);
  useEffect(() => { if (newlyAdded) setOpen(true); }, [newlyAdded]);
  return <details className={styles.card} open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{value.station.name}</summary>
    {value.station.is_active === false && <p>{fr ? "Cette station n’est actuellement plus proposée dans le catalogue." : "This resort is currently unavailable in the catalogue."}</p>}
    <form onSubmit={event => { event.preventDefault(); void onSave(draft); }}><div className="preference-grid">{topics.map(([key, label, english]) => <label className="preference-toggle" key={key}><span>{fr ? label : english}</span><input type="checkbox" checked={Boolean(draft[key])} onChange={event => { const checked = event.target.checked; setDraft(old => ({ ...old, [key]: checked })); }} disabled={busy} /></label>)}</div>
      <label className="newsletter-field">{fr ? "Fréquence pour cette station" : "Frequency for this resort"}<select value={draft.newsletter_frequency} onChange={event => setDraft(old => ({ ...old, newsletter_frequency: event.target.value as NewsletterFrequency }))} disabled={busy}>
        <option value="immediate">{fr ? "Dès qu’une information est disponible" : "As soon as an update is available"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="monthly">{fr ? "Chaque mois" : "Monthly"}</option>
      </select></label><div className={styles.actions}><button className="btn btn--primary" disabled={busy}>{fr ? "Enregistrer pour cette station" : "Save for this resort"}</button><button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void onRemove()}>{fr ? "Retirer cette station" : "Remove this resort"}</button></div>
    </form>
  </details>;
}
