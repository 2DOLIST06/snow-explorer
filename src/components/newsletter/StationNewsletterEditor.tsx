import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { intentPreferences, settingsIntent, subscriptionSummary, type StationIntent } from "@/lib/newsletter/onboarding";
import type { StationSummary, StationSettings, StationSettingsApi } from "@/types/newsletter";
import StationSubscriptionPicker from "./StationSubscriptionPicker";
import StationSubscriptionFields from "./StationSubscriptionFields";
import styles from "./StationNewsletterEditor.module.css";
export type { StationTopics, StationSettings, StationSettingsApi } from "@/types/newsletter";

function hasChanges(value: StationSettings, draft: StationIntent) {
  return Object.entries(intentPreferences(draft)).some(([key, next]) => value.preferences[key as keyof typeof value.preferences] !== next);
}

export default function StationNewsletterEditor({ api, locale = "fr" }: { api: StationSettingsApi; locale?: "fr" | "en" }) {
  const fr = locale === "fr";
  const [stations, setStations] = useState<StationSettings[]>([]); const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false); const [drafts, setDrafts] = useState<Record<string, StationIntent>>({});
  const [activeId, setActiveId] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { let live = true; setLoading(true); api.list().then(rows => { if (live) { setStations(rows); setDrafts({}); setActiveId(null); } }).catch(() => { if (live) setError(fr ? "Impossible de charger vos stations. Réessayez." : "Unable to load your resorts. Please try again."); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [api, fr]);
  const followed = useMemo(() => new Set(stations.map(row => String(row.station.id))), [stations]);
  const active = stations.find(row => String(row.station.id) === activeId);
  const draft = active ? drafts[String(active.station.id)] || settingsIntent(active) : null;
  const dirty = Boolean(active && draft && hasChanges(active, draft));
  function focusEditor() { if (typeof window === "undefined") return; window.requestAnimationFrame(() => titleRef.current?.focus()); }
  async function action(fn: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch { setError(fr ? "Impossible d’enregistrer cette modification. Réessayez." : "Unable to save this change. Please try again."); }
    finally { setBusy(false); }
  }
  async function add(station: StationSummary) {
    if (followed.has(String(station.id))) return;
    await action(async () => {
      const value = await api.add(station.id);
      setStations(old => old.some(row => String(row.station.id) === String(value.station.id)) ? old : [...old, value]);
      setAdding(false); setActiveId(String(value.station.id)); setNotice(fr ? `${value.station.name} ajoutée. Choisissez ses informations, puis enregistrez.` : `${value.station.name} added. Choose its updates, then save.`); focusEditor();
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!active || !draft) return;
    const id = String(active.station.id);
    await action(async () => { const saved = await api.save(id, intentPreferences(draft)); setStations(old => old.map(row => String(row.station.id) === id ? saved : row)); setDrafts(old => { const next = { ...old }; delete next[id]; return next; }); setActiveId(null); setNotice(fr ? `Abonnements de ${saved.station.name} enregistrés.` : `Subscriptions for ${saved.station.name} saved.`); });
  }
  return <section className={styles.editor} aria-label={fr ? "Mes stations abonnées" : "My subscribed resorts"}>
    <div className={styles.listHeading}><h3>{fr ? "Mes stations" : "My resorts"} <span>({stations.length})</span></h3></div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
    {loading ? <p role="status">{fr ? "Chargement…" : "Loading…"}</p> : <>
      {!stations.length && <p className={styles.hint}>{fr ? "Aucune station suivie pour le moment. Ajoutez votre première station." : "No resorts followed yet. Add your first resort."}</p>}
      <ul className={styles.stationRows} aria-label={fr ? "Stations suivies" : "Followed resorts"}>{stations.map(entry => { const id = String(entry.station.id); return <li key={id} data-editing={activeId === id}>
        <div className={styles.stationIdentity}><strong>{entry.station.name}</strong><span>{subscriptionSummary(settingsIntent(entry), fr)}{drafts[id] && hasChanges(entry, drafts[id]) ? (fr ? " · Modifications non enregistrées" : " · Unsaved changes") : ""}</span></div>
        <div className={styles.rowActions}><button type="button" className={styles.textButton} disabled={busy} aria-label={`${fr ? "Modifier" : "Edit"} ${entry.station.name}`} onClick={() => { setActiveId(id); setAdding(false); focusEditor(); }}>{activeId === id ? (fr ? "En cours" : "Editing") : (fr ? "Modifier" : "Edit")}</button><button type="button" className={styles.textButton} disabled={busy} aria-label={`${fr ? "Retirer" : "Remove"} ${entry.station.name}`} onClick={() => void action(async () => { await api.remove(id); setStations(old => old.filter(row => String(row.station.id) !== id)); if (activeId === id) setActiveId(null); setNotice(fr ? `${entry.station.name} retirée.` : `${entry.station.name} removed.`); })}>{fr ? "Retirer" : "Remove"}</button></div>
      </li>; })}</ul>
      {active && draft && !adding && <form className={styles.editPanel} aria-label={`${fr ? "Réglages de" : "Settings for"} ${active.station.name}`} onSubmit={save}>
        <header><div><p>{fr ? "Informations à recevoir pour" : "Updates for"}</p><h4 ref={titleRef} tabIndex={-1}>{active.station.name}</h4></div><button type="button" className={styles.textButton} disabled={busy} onClick={() => setActiveId(null)}>{fr ? "Fermer les réglages" : "Close settings"}</button></header>
        {active.station.is_active === false && <p>{fr ? "Cette station n’est plus proposée dans le catalogue." : "This resort is no longer in the catalogue."}</p>}
        <StationSubscriptionFields value={draft} fr={fr} disabled={busy} onChange={value => setDrafts(old => ({ ...old, [String(value.station_id)]: value }))} />
        <div className={styles.saveBar}><span>{dirty ? (fr ? "Modifications à enregistrer" : "Unsaved changes") : (fr ? "Préférences enregistrées" : "Saved preferences")}</span><div className={styles.actions}><button className="btn btn--primary" disabled={busy}>{fr ? "Enregistrer cette station" : "Save this resort"}</button><button type="button" className={styles.textButton} disabled={busy} onClick={() => setDrafts(old => ({ ...old, [String(draft.station_id)]: { ...draft, topics: [], weather_frequency: "disabled" } }))}>{fr ? "Tout désactiver" : "Disable all"}</button></div></div>
      </form>}
      {adding ? <StationSubscriptionPicker followedIds={followed} onPick={station => void add(station)} onClose={() => setAdding(false)} disabled={busy} fr={fr} /> : <button type="button" className={styles.addButton} disabled={busy} onClick={() => setAdding(true)}>+ {fr ? "Ajouter une station" : "Add a resort"}</button>}
    </>}
  </section>;
}
