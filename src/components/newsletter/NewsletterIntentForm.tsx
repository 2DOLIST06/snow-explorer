import { FormEvent, useMemo, useRef, useState } from "react";
import { subscriptionSummary, type NewsletterIntent, type StationIntent } from "@/lib/newsletter/onboarding";
import type { NewsletterFrequency, StationSummary } from "@/types/newsletter";
import StationSubscriptionPicker from "./StationSubscriptionPicker";
import StationSubscriptionFields from "./StationSubscriptionFields";
import styles from "./StationNewsletterEditor.module.css";

type Props = { initial: NewsletterIntent; onSave: (intent: NewsletterIntent) => Promise<void>; submitLabel?: string; focusStationId?: string | number; onCancel?: () => void };
export default function NewsletterIntentForm({ initial, onSave, submitLabel, focusStationId, onCancel }: Props) {
  const [draft, setDraft] = useState(initial); const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [activeId, setActiveId] = useState<string | null>(focusStationId != null ? String(focusStationId) : initial.stations[0] ? String(initial.stations[0].station_id) : null);
  const [adding, setAdding] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [saved, setSaved] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fr = draft.language === "fr"; const dirty = JSON.stringify(draft) !== baseline;
  const followed = useMemo(() => new Set(draft.stations.map(row => String(row.station_id))), [draft.stations]);
  const active = draft.stations.find(row => String(row.station_id) === activeId);
  function focusEditor() { if (typeof window === "undefined") return; window.requestAnimationFrame(() => titleRef.current?.focus()); }
  function add(stations: StationSummary[]) {
    const additions = stations.filter(station => !followed.has(String(station.id))).map(station => ({ station_id: station.id, station_name: station.name, topics: [], newsletter_frequency: "weekly", weather_frequency: "friday" } as StationIntent));
    if (!additions.length || draft.stations.length + additions.length > 20) return;
    setError(""); setDraft(old => ({ ...old, stations: [...old.stations, ...additions] })); setActiveId(String(additions[0].station_id)); setAdding(false);
    setNotice(fr ? `${additions.length} station(s) ajoutée(s) à votre sélection. Personnalisez les informations pour chacune.` : `${additions.length} resort(s) added to your selection. Choose updates for each one.`); focusEditor();
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    if (adding) { setError(fr ? "Ajoutez les stations cochées ou fermez la liste avant d’enregistrer." : "Add the checked resorts or close the list before saving."); return; }
    setBusy(true);
    try { await onSave(draft); setBaseline(JSON.stringify(draft)); setSaved(true); setNotice(fr ? "Vos choix sont enregistrés." : "Your choices are saved."); setActiveId(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : (fr ? "Enregistrement impossible." : "Unable to save.")); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className={styles.editor}>
    <label className={styles.general}><input type="checkbox" checked={draft.articles === true} disabled={busy} onChange={event => setDraft(old => ({ ...old, articles: event.target.checked }))} /><span>{fr ? "Recevoir les articles et guides, toutes destinations" : "Receive articles and guides, all destinations"}</span></label>
    {draft.articles && <label className="newsletter-field">{fr ? "Fréquence des articles et guides" : "Articles and guides frequency"}<select aria-label={fr ? "Fréquence des articles et guides" : "Articles and guides frequency"} value={draft.newsletter_frequency || "weekly"} disabled={busy} onChange={event => setDraft(old => ({ ...old, newsletter_frequency: event.target.value as NewsletterFrequency }))}><option value="immediate">{fr ? "À chaque publication" : "On publication"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="monthly">{fr ? "Chaque mois" : "Monthly"}</option></select></label>}
    <div className={styles.listHeading}><h4>{fr ? "Mes stations" : "My resorts"} <span>({draft.stations.length})</span></h4><span className={styles.hint}>{fr ? "Sélection en cours" : "Current selection"}</span></div>
    {!draft.stations.length && <p className={styles.hint}>{fr ? "Aucune station choisie pour le moment." : "No resorts selected yet."}</p>}
    <ul className={styles.stationRows} aria-label={fr ? "Stations sélectionnées" : "Selected resorts"}>{draft.stations.map(row => <li key={String(row.station_id)} data-editing={activeId === String(row.station_id)}>
      <div className={styles.stationIdentity}><strong>{row.station_name}</strong><span>{subscriptionSummary(row, fr)}</span></div>
      <div className={styles.rowActions}><button type="button" className={styles.textButton} disabled={busy} onClick={() => { setActiveId(String(row.station_id)); setAdding(false); focusEditor(); }} aria-label={`${fr ? "Modifier" : "Edit"} ${row.station_name}`}>{activeId === String(row.station_id) ? (fr ? "En cours" : "Editing") : (fr ? "Modifier" : "Edit")}</button><button type="button" className={styles.textButton} disabled={busy} onClick={() => { setDraft(old => ({ ...old, stations: old.stations.filter(item => String(item.station_id) !== String(row.station_id)) })); if (activeId === String(row.station_id)) setActiveId(null); setNotice(fr ? `${row.station_name} retirée de votre sélection.` : `${row.station_name} removed from your selection.`); }} aria-label={`${fr ? "Retirer" : "Remove"} ${row.station_name}`}>{fr ? "Retirer" : "Remove"}</button></div>
    </li>)}</ul>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {active && !adding && <section className={styles.editPanel} aria-label={`${fr ? "Réglages de" : "Settings for"} ${active.station_name}`}>
      <header><div><p>{fr ? "Informations à recevoir pour" : "Updates for"}</p><h4 ref={titleRef} tabIndex={-1}>{active.station_name}</h4></div><button type="button" className={styles.textButton} disabled={busy} onClick={() => setActiveId(null)}>{fr ? "Fermer les réglages" : "Close settings"}</button></header>
      <StationSubscriptionFields value={active} fr={fr} disabled={busy} onChange={value => setDraft(old => ({ ...old, stations: old.stations.map(row => String(row.station_id) === String(value.station_id) ? value : row) }))} />
    </section>}
    {draft.stations.length < 20 && (adding ? <StationSubscriptionPicker followedIds={followed} onAdd={add} maxSelections={20 - draft.stations.length} onClose={() => setAdding(false)} disabled={busy} fr={fr} /> : <button type="button" className={styles.addButton} disabled={busy} onClick={() => setAdding(true)}>+ {fr ? "Ajouter une station" : "Add a resort"}</button>)}
    {error && <p role="alert">{error}</p>}
    <div className={styles.saveBar}><span>{dirty ? (fr ? "Modifications à enregistrer" : "Unsaved changes") : saved ? (fr ? "Choix enregistrés" : "Choices saved") : (fr ? "Choisissez vos informations, puis enregistrez" : "Choose your updates, then save")}</span><div className={styles.actions}><button className="btn btn--primary" disabled={busy || adding}>{busy ? (fr ? "Enregistrement…" : "Saving…") : submitLabel || (fr ? "Enregistrer mes choix" : "Save my choices")}</button>{onCancel && <button type="button" className={styles.textButton} disabled={busy} onClick={onCancel}>{fr ? "Annuler cet ajout" : "Cancel this addition"}</button>}</div></div>
  </form>;
}
