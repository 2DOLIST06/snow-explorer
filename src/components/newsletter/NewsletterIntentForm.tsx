import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { type NewsletterIntent, type StationIntent } from "@/lib/newsletter/onboarding";
import type { NewsletterFrequency, StationSummary } from "@/types/newsletter";
import StationSubscriptionPicker from "./StationSubscriptionPicker";
import StationSubscriptionFields from "./StationSubscriptionFields";
import styles from "./StationNewsletterEditor.module.css";

type Props = { beforeFields?: ReactNode; beforeSubmit?: ReactNode; initial: NewsletterIntent; onSave: (intent: NewsletterIntent) => Promise<void>; submitLabel?: string; onCancel?: () => void; disabled?: boolean; onSavingChange?: (saving: boolean) => void };
export default function NewsletterIntentForm({ initial, onSave, submitLabel, onCancel, beforeFields, beforeSubmit, disabled = false, onSavingChange }: Props) {
  const [draft, setDraft] = useState(initial); const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [adding, setAdding] = useState(false); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const fr = draft.language === "fr"; const dirty = JSON.stringify(draft) !== baseline; const busy = saving || disabled;
  const followed = useMemo(() => new Set(draft.stations.map(row => String(row.station_id))), [draft.stations]);
  function add(stations: StationSummary[]) {
    const additions = stations.filter(station => !followed.has(String(station.id))).map(station => ({ station_id: station.id, station_name: station.name, station_slug: station.slug, topics: [], newsletter_frequency: "weekly", weather_frequency: "friday" } as StationIntent));
    if (!additions.length || draft.stations.length + additions.length > 20) return;
    setError(""); setSaved(false); setDraft(old => ({ ...old, stations: [...old.stations, ...additions] })); setAdding(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError("");
    if (adding) { setError(fr ? "Ajoutez les stations cochées ou fermez la liste avant d’enregistrer." : "Add the checked resorts or close the list before saving."); return; }
    setSaving(true); onSavingChange?.(true);
    try { await onSave(draft); setBaseline(JSON.stringify(draft)); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : (fr ? "Enregistrement impossible." : "Unable to save.")); }
    finally { setSaving(false); onSavingChange?.(false); }
  }
  return <form onSubmit={save} className={styles.editor}>
    {beforeFields}
    <section className={styles.generalSection} aria-label={fr ? "Articles et guides" : "Articles and guides"}>
      <div><h3>{fr ? "Articles et guides généraux" : "General articles and guides"}</h3><p className={styles.hint}>{fr ? "Les nouveautés Snow Explorer, toutes destinations." : "New content from all destinations."}</p></div>
      <label className={styles.topic}><input type="checkbox" checked={draft.articles === true} disabled={busy} onChange={event => setDraft(old => ({ ...old, articles: event.target.checked }))} /><span>{fr ? "Recevoir les articles et guides généraux" : "Receive general articles and guides"}</span></label>
      <label className={styles.frequency}>{fr ? "Fréquence des articles et guides" : "Articles and guides frequency"}<select aria-label={fr ? "Fréquence des articles et guides" : "Articles and guides frequency"} value={draft.newsletter_frequency || "weekly"} disabled={busy || !draft.articles} onChange={event => setDraft(old => ({ ...old, newsletter_frequency: event.target.value as NewsletterFrequency }))}><option value="immediate">{fr ? "À chaque publication" : "On publication"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="monthly">{fr ? "Chaque mois" : "Monthly"}</option></select></label>
    </section>
    <div className={styles.listHeading}><div><h3>{fr ? "Mes stations" : "My resorts"} ({draft.stations.length})</h3><p className={styles.hint}>{fr ? "Cochez les informations à recevoir pour chaque station." : "Choose the updates to receive for each resort."}</p></div>{draft.stations.length < 20 && !adding && <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setAdding(true)}>{fr ? "Ajouter des stations" : "Add resorts"}</button>}</div>
    {adding && <StationSubscriptionPicker followedIds={followed} onAdd={add} maxSelections={20 - draft.stations.length} onClose={() => setAdding(false)} disabled={busy} fr={fr} />}
    {!draft.stations.length && !adding && <p className={styles.empty}>{fr ? "Vous ne suivez aucune station. Ajoutez vos stations pour choisir les informations à recevoir." : "You do not follow any resorts yet. Add resorts to choose your updates."}</p>}
    <div className={styles.stations}>{draft.stations.map(row => <section key={String(row.station_id)} className={styles.station} aria-label={row.station_name}>
      <header><div className={styles.stationTitle}><h4>{row.station_name}</h4>{row.station_slug && <a className={styles.stationLink} href={`/stations/${encodeURIComponent(row.station_slug)}`}>{fr ? "Voir la station" : "View resort"} <span aria-hidden="true">↗</span></a>}</div><button type="button" className={styles.removeButton} disabled={busy} onClick={() => { setDraft(old => ({ ...old, stations: old.stations.filter(item => String(item.station_id) !== String(row.station_id)) })); setSaved(false); }} aria-label={`${fr ? "Retirer" : "Remove"} ${row.station_name}`}>{fr ? "Retirer la station" : "Remove resort"}</button></header>
      <StationSubscriptionFields value={row} fr={fr} disabled={busy} onChange={value => setDraft(old => ({ ...old, stations: old.stations.map(item => String(item.station_id) === String(value.station_id) ? value : item) }))} />
    </section>)}</div>
    {beforeSubmit}
    {error && <p role="alert">{error}</p>}
    <div className={styles.saveBar}><p role="status">{dirty ? (fr ? "Vos modifications ne sont pas encore enregistrées." : "Your changes have not been saved yet.") : saved ? (fr ? "Vos préférences sont enregistrées." : "Your preferences are saved.") : ""}</p><div className={styles.actions}><button className="btn btn--primary" disabled={busy || adding}>{saving ? (fr ? "Enregistrement…" : "Saving…") : submitLabel || (fr ? "Enregistrer mes préférences" : "Save my preferences")}</button>{onCancel && <button type="button" className={styles.textButton} disabled={busy} onClick={onCancel}>{fr ? "Annuler" : "Cancel"}</button>}</div></div>
  </form>;
}
