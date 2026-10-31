import { FormEvent, useMemo, useRef, useState } from "react";
import { subscriptionSummary, type NewsletterIntent, type StationIntent } from "@/lib/newsletter/onboarding";
import type { StationSummary } from "@/types/newsletter";
import StationSubscriptionPicker from "./StationSubscriptionPicker";
import StationSubscriptionFields from "./StationSubscriptionFields";
import styles from "./StationNewsletterEditor.module.css";

type Props = { initial: NewsletterIntent; onSave: (intent: NewsletterIntent) => Promise<void>; submitLabel?: string; onCancel?: () => void };
export default function NewsletterIntentForm({ initial, onSave, submitLabel, onCancel }: Props) {
  const [draft, setDraft] = useState(initial); const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [activeId, setActiveId] = useState<string | null>(initial.stations[0] ? String(initial.stations[0].station_id) : null);
  const [adding, setAdding] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [saved, setSaved] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fr = draft.language === "fr"; const dirty = JSON.stringify(draft) !== baseline;
  const followed = useMemo(() => new Set(draft.stations.map(row => String(row.station_id))), [draft.stations]);
  const active = draft.stations.find(row => String(row.station_id) === activeId);
  function focusEditor() { if (typeof window === "undefined") return; window.requestAnimationFrame(() => titleRef.current?.focus()); }
  function add(station: StationSummary) {
    if (followed.has(String(station.id))) return;
    const row: StationIntent = { station_id: station.id, station_name: station.name, topics: [], newsletter_frequency: "weekly", weather_frequency: "friday" };
    setDraft(old => ({ ...old, stations: [...old.stations, row] })); setActiveId(String(station.id)); setAdding(false);
    setNotice(fr ? `${station.name} ajoutée à votre sélection. Choisissez ses informations ci-dessous.` : `${station.name} added to your selection. Choose its updates below.`); focusEditor();
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    const empty = draft.stations.find(row => !row.topics.length);
    if (empty) { setActiveId(String(empty.station_id)); setAdding(false); setError(fr ? `Choisissez au moins une information pour ${empty.station_name}, ou retirez cette station.` : `Choose at least one update for ${empty.station_name}, or remove it.`); focusEditor(); return; }
    setBusy(true);
    try { await onSave(draft); setBaseline(JSON.stringify(draft)); setSaved(true); setNotice(fr ? "Vos choix sont enregistrés." : "Your choices are saved."); setActiveId(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : (fr ? "Enregistrement impossible." : "Unable to save.")); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className={styles.editor}>
    <label className={styles.general}><input type="checkbox" checked={draft.articles === true} disabled={busy} onChange={event => setDraft(old => ({ ...old, articles: event.target.checked }))} /><span>{fr ? "Recevoir les articles et guides, toutes destinations" : "Receive articles and guides, all destinations"}</span></label>
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
    {draft.stations.length < 20 && (adding ? <StationSubscriptionPicker followedIds={followed} onPick={add} onClose={() => setAdding(false)} disabled={busy} fr={fr} /> : <button type="button" className={styles.addButton} disabled={busy} onClick={() => setAdding(true)}>+ {fr ? "Ajouter une station" : "Add a resort"}</button>)}
    {error && <p role="alert">{error}</p>}
    <div className={styles.saveBar}><span>{dirty ? (fr ? "Modifications à enregistrer" : "Unsaved changes") : saved ? (fr ? "Choix enregistrés" : "Choices saved") : (fr ? "Choisissez vos informations, puis enregistrez" : "Choose your updates, then save")}</span><div className={styles.actions}><button className="btn btn--primary" disabled={busy}>{busy ? (fr ? "Enregistrement…" : "Saving…") : submitLabel || (fr ? "Enregistrer mes choix" : "Save my choices")}</button>{onCancel && <button type="button" className={styles.textButton} disabled={busy} onClick={onCancel}>{fr ? "Annuler cet ajout" : "Cancel this addition"}</button>}</div></div>
  </form>;
}
