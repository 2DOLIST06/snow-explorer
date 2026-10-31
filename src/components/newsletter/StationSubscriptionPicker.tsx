import { useEffect, useState } from "react";
import { newsletterApi } from "@/lib/api/newsletter";
import { filterStations } from "@/lib/searchNormalization";
import type { StationSummary } from "@/types/newsletter";
import styles from "./StationNewsletterEditor.module.css";

type Props = { followedIds: Set<string>; onPick: (station: StationSummary) => void; onClose: () => void; disabled?: boolean; fr: boolean };
export default function StationSubscriptionPicker({ followedIds, onPick, onClose, disabled, fr }: Props) {
  const [query, setQuery] = useState(""); const [stations, setStations] = useState<StationSummary[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let live = true; setLoading(true); setError(false); newsletterApi.listStations().then(rows => { if (live) setStations(rows); }).catch(() => { if (live) setError(true); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [attempt]);
  const matches = filterStations(stations, query).filter(station => !followedIds.has(String(station.id)));
  return <section className={styles.picker} aria-label={fr ? "Rechercher une station à ajouter" : "Find a resort to add"}>
    <div className={styles.pickerHeading}><strong>{fr ? "Ajouter une station" : "Add a resort"}</strong><button type="button" className={styles.textButton} disabled={disabled} onClick={onClose}>{fr ? "Fermer" : "Close"}</button></div>
    <label className={styles.searchLabel}>{fr ? "Nom de la station" : "Resort name"}<input type="search" autoFocus value={query} placeholder={fr ? "Ex. La Clusaz, Alpe d’Huez…" : "Search resorts…"} disabled={disabled} onChange={event => setQuery(event.target.value)} /></label>
    {loading ? <p role="status">{fr ? "Chargement…" : "Loading…"}</p> : error ? <div role="alert"><p>{fr ? "Impossible de charger les stations." : "Unable to load resorts."}</p><button type="button" onClick={() => setAttempt(old => old + 1)}>{fr ? "Réessayer" : "Retry"}</button></div> : query.trim() ? <div className={styles.results}>
      {!matches.length && <p>{fr ? "Aucune autre station trouvée." : "No other resort found."}</p>}
      {matches.slice(0, 10).map(station => <button type="button" key={String(station.id)} disabled={disabled} onClick={() => onPick(station)} aria-label={`${fr ? "Ajouter" : "Add"} ${station.name}`}><span>{station.name}</span><span aria-hidden="true">+</span></button>)}
      {matches.length > 10 && <p>{fr ? "Précisez le nom pour affiner les résultats." : "Type more of the name to narrow the results."}</p>}
    </div> : <p className={styles.hint}>{fr ? "Recherchez une station, puis cliquez sur son nom pour l’ajouter." : "Search for a resort, then select its name to add it."}</p>}
  </section>;
}
