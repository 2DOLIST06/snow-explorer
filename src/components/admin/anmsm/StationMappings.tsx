import { useCallback, useEffect, useMemo, useState } from "react";
import AccessibleModal from "@/components/admin/imports/AccessibleModal";
import { confirmAnmsmStationMappings, deleteAnmsmStationMapping, listAnmsmStationMappings, searchAnmsmResorts } from "@/lib/api/anmsmLogos";
import type { AnmsmMappingResult, AnmsmResort, AnmsmStationMapping } from "@/types/anmsmLogo";

const EMPTY_STATS = { stations_received: 0, stations_matched: 0, stations_unmatched: 0, stations_without_logo: 0 };
const keyOf = (value: string | number) => String(value);
const isMatched = (item: AnmsmStationMapping) => item.status === "matched" || !!item.resort;

function ResortPicker({ item, value, onChange }: { item: AnmsmStationMapping; value: AnmsmResort | null; onChange: (value: AnmsmResort | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnmsmResort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await searchAnmsmResorts(query.trim());
        setResults(Array.isArray(response) ? response : response.items || response.results || []);
      } catch (e) { setError(e instanceof Error ? e.message : "Recherche impossible."); }
      finally { setLoading(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);
  return <div className="anmsm-resort-picker">
    {value && <div className="anmsm-picked"><span><strong>{value.name}</strong>{value.slug ? ` · ${value.slug}` : ""}</span><button type="button" onClick={() => onChange(null)} aria-label={`Effacer le choix ${value.name}`}>Effacer</button></div>}
    <label>Rechercher une autre station<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Saisir au moins 2 caractères" autoComplete="off" /></label>
    {loading && <small aria-live="polite">Recherche…</small>}{error && <small className="anmsm-field-error" role="alert">{error}</small>}
    {!!results.length && <ul className="anmsm-resort-results" aria-label="Résultats de recherche">{results.map(resort => {
      const linkedElsewhere = resort.linked_anmsm_station_id != null && keyOf(resort.linked_anmsm_station_id) !== keyOf(item.anmsm_station_id);
      return <li key={resort.id}><button type="button" disabled={linkedElsewhere} onClick={() => { onChange(resort); setQuery(""); setResults([]); }}><strong>{resort.name}</strong>{resort.slug ? <span>{resort.slug}</span> : null}{linkedElsewhere && <em>Déjà liée à l’identifiant ANMSM {resort.linked_anmsm_station_id}</em>}</button></li>;
    })}</ul>}
    {query.trim().length >= 2 && !loading && !error && !results.length && <small>Aucune station trouvée.</small>}
  </div>;
}

export default function StationMappings({ onRequestSync }: { onRequestSync: () => void }) {
  const [data, setData] = useState({ items: [] as AnmsmStationMapping[], stats: EMPTY_STATS, page: 1, pages: 1, total: 0 });
  const [filter, setFilter] = useState<"" | "unmatched" | "matched">("unmatched");
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const [choices, setChoices] = useState<Record<string, AnmsmResort | null>>({}); const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false); const [removing, setRemoving] = useState<AnmsmStationMapping | null>(null); const [result, setResult] = useState<AnmsmMappingResult | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await listAnmsmStationMappings({ search, status: filter, page, per_page: 20 });
      setData({ items: response.items || [], stats: response.stats || EMPTY_STATS, page: response.page ?? page, pages: Math.max(1, response.pages ?? 1), total: response.total ?? 0 });
      setChoices(previous => { const next = { ...previous }; (response.items || []).forEach(item => { const key = keyOf(item.anmsm_station_id); if (!(key in next)) next[key] = item.resort || item.suggested_resort || null; }); return next; });
    } catch (e) { setError(e instanceof Error ? e.message : "Chargement des correspondances impossible."); }
    finally { setLoading(false); }
  }, [filter, page, search]);
  useEffect(() => { void load(); }, [load]);
  const selectedRows = useMemo(() => data.items.filter(item => selected.has(keyOf(item.anmsm_station_id)) && choices[keyOf(item.anmsm_station_id)]), [choices, data.items, selected]);
  const toggle = (item: AnmsmStationMapping) => { const key = keyOf(item.anmsm_station_id); if (!choices[key]) return; setSelected(previous => { const next = new Set(previous); next.has(key) ? next.delete(key) : next.add(key); return next; }); };
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const response = await confirmAnmsmStationMappings(selectedRows.map(item => ({ anmsm_station_id: item.anmsm_station_id, resort_id: choices[keyOf(item.anmsm_station_id)]!.id })));
      setResult(response); setSelected(new Set()); setConfirming(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Validation impossible."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!removing) return; setBusy(true); setError("");
    try { await deleteAnmsmStationMapping(removing.anmsm_station_id); setRemoving(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Suppression de la correspondance impossible."); }
    finally { setBusy(false); }
  };
  return <section className="anmsm-mappings" aria-labelledby="mapping-title">
    <header><div><h2 id="mapping-title">Correspondances des stations</h2><p>Une suggestion reste une proposition : vous devez confirmer chaque association avant de synchroniser les logos.</p></div></header>
    <div className="anmsm-stats" aria-label="Statistiques des correspondances">{[["Stations reçues", data.stats.stations_received], ["Stations associées", data.stats.stations_matched], ["Stations à associer", data.stats.stations_unmatched], ["Stations sans logo", data.stats.stations_without_logo]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}</div>
    {error && <div className="notice notice--danger" role="alert"><strong>Action impossible</strong><span>{error}</span></div>}
    {result && <div className={`anmsm-result ${result.failed ? "anmsm-result--partial" : ""}`} role="status"><strong>{result.succeeded} correspondance(s) enregistrée(s).</strong>{result.failed > 0 && <span>{result.failed} échec(s). {result.failures?.map(failure => `${failure.anmsm_station_id} : ${failure.error}`).join(" · ")}</span>}<button className="btn btn--primary" onClick={onRequestSync}>Relancer la synchronisation des logos</button></div>}
    <div className="anmsm-mapping-tools"><label>Rechercher<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Nom ou identifiant ANMSM" /></label><fieldset><legend>Filtrer</legend>{[["", "Toutes"], ["unmatched", "À associer"], ["matched", "Associées"]].map(([value, label]) => <button type="button" className={filter === value ? "active" : ""} key={value} onClick={() => { setFilter(value as typeof filter); setPage(1); }}>{label}</button>)}</fieldset></div>
    <div className="anmsm-selection"><button className="btn btn--secondary" onClick={() => setSelected(new Set(data.items.filter(item => choices[keyOf(item.anmsm_station_id)]).map(item => keyOf(item.anmsm_station_id))))}>Tout sélectionner sur cette page</button><button className="btn btn--secondary" onClick={() => setSelected(new Set())}>Tout décocher</button><button className="btn btn--secondary" onClick={() => setSelected(new Set(data.items.filter(item => !isMatched(item) && item.suggestion_type === "exact" && choices[keyOf(item.anmsm_station_id)]).map(item => keyOf(item.anmsm_station_id))))}>Sélectionner les égalités exactes proposées</button><button className="btn btn--primary" disabled={!selectedRows.length || busy} onClick={() => setConfirming(true)}>Valider les correspondances sélectionnées</button></div>
    {loading ? <div className="anmsm-loading" aria-live="polite">Chargement des correspondances…</div> : !data.items.length ? <div className="empty-state"><strong>Aucune station pour ces critères.</strong><span>Modifiez la recherche ou le filtre.</span></div> : <div className="anmsm-mapping-table-wrap"><table className="anmsm-mapping-table"><thead><tr><th>Sélection</th><th>Station ANMSM</th><th>Suggestion du backend</th><th>Station Snow Explorer choisie</th><th>État</th></tr></thead><tbody>{data.items.map(item => {
      const key = keyOf(item.anmsm_station_id); const choice = choices[key] || null; const matched = isMatched(item);
      return <tr key={key}><td><input type="checkbox" checked={selected.has(key)} disabled={!choice} onChange={() => toggle(item)} aria-label={`Sélectionner la correspondance de ${item.anmsm_station_name}`} /></td><td><div className="anmsm-station"><div className="anmsm-mini-logo">{item.anmsm_logo_url ? <img src={item.anmsm_logo_url} alt="" /> : <span>Sans logo</span>}</div><div><strong>{item.anmsm_station_name}</strong><small>Identifiant ANMSM : {item.anmsm_station_id}</small></div></div></td><td>{item.suggested_resort ? <><strong>{item.suggested_resort.name}</strong><span className={`anmsm-suggestion anmsm-suggestion--${item.suggestion_type}`}>{item.suggestion_type === "exact" ? "Correspondance exacte proposée" : "Correspondance à contrôler"}</span><small>Score : {item.suggestion_score ?? "—"}</small></> : <span>Pas de suggestion</span>}</td><td>{matched && item.resort && <p className="anmsm-current-mapping">Association actuelle : <strong>{item.resort.name}</strong>{item.resort.slug ? ` · ${item.resort.slug}` : ""}</p>}<ResortPicker item={item} value={choice} onChange={value => { setChoices(previous => ({ ...previous, [key]: value })); if (!value) setSelected(previous => { const next = new Set(previous); next.delete(key); return next; }); }} />{matched && <button className="btn btn--danger" disabled={busy} onClick={() => setRemoving(item)}>Supprimer la correspondance</button>}</td><td><span className={`anmsm-status anmsm-status--${matched ? "approved" : "pending"}`}>{matched ? "Associée" : "À associer"}</span></td></tr>;
    })}</tbody></table></div>}
    <nav className="anmsm-pagination" aria-label="Pagination des correspondances"><button className="btn btn--secondary" disabled={data.page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Page précédente</button><span>Page {data.page} sur {data.pages} · {data.total} résultat(s)</span><button className="btn btn--secondary" disabled={data.page >= data.pages || loading} onClick={() => setPage(value => value + 1)}>Page suivante</button></nav>
    <AccessibleModal open={confirming} title="Confirmer les correspondances" busy={busy} onClose={() => setConfirming(false)}><div className="anmsm-modal"><p>Vérifiez chaque association. Cette action ne valide et ne publie aucun logo.</p><ul>{selectedRows.map(item => <li key={keyOf(item.anmsm_station_id)}><strong>{item.anmsm_station_name}</strong> → <strong>{choices[keyOf(item.anmsm_station_id)]!.name}</strong></li>)}</ul><div className="anmsm-modal-actions"><button className="btn btn--secondary" onClick={() => setConfirming(false)}>Annuler</button><button className="btn btn--primary" disabled={busy} onClick={() => void submit()}>Confirmer les correspondances</button></div></div></AccessibleModal>
    <AccessibleModal open={!!removing} title="Supprimer la correspondance" busy={busy} onClose={() => setRemoving(null)}><div className="anmsm-modal"><p>Supprimer l’association entre <strong>{removing?.anmsm_station_name}</strong> et <strong>{removing?.resort?.name}</strong> ? La station et son logo publié ne seront pas supprimés.</p><div className="anmsm-modal-actions"><button className="btn btn--secondary" onClick={() => setRemoving(null)}>Annuler</button><button className="btn btn--danger" disabled={busy} onClick={() => void remove()}>Supprimer uniquement la correspondance</button></div></div></AccessibleModal>
  </section>;
}
