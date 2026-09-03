import { useCallback, useEffect, useMemo, useState } from "react";
import AccessibleModal from "@/components/admin/imports/AccessibleModal";
import { confirmAnmsmStationMappings, deleteAnmsmStationMapping, listAnmsmStationMappings, searchAnmsmResorts } from "@/lib/api/anmsmLogos";
import type { AnmsmMappingResult, AnmsmMappingSuggestion, AnmsmResort, AnmsmStationMapping } from "@/types/anmsmLogo";

const EMPTY_STATS = { received: 0, matched: 0, unmatched: 0, withoutLogo: 0 };
const PAGE_SIZES = [20, 50, 100] as const;
let mappingPageSizePreference: PageSize = 20;
type PageSize = 20 | 50 | 100 | "all";
const keyOf = (value: string | number) => String(value);
const suggestionAsResort = (suggestion: AnmsmMappingSuggestion): AnmsmResort => ({ id: suggestion.stationId, name: suggestion.name, slug: suggestion.slug });
const bestSuggestion = (item: AnmsmStationMapping) => item.suggestions[0] || null;
const isExact = (suggestion: AnmsmMappingSuggestion | null) => suggestion?.matchType === "normalized_exact" || suggestion?.score === 100;

function mappedResort(mapping: unknown): AnmsmResort | null {
  if (!mapping || typeof mapping !== "object") return null;
  const value = mapping as Record<string, unknown>;
  const nested = value.resort && typeof value.resort === "object" ? value.resort as Record<string, unknown> : value;
  const id = nested.station_id ?? nested.stationId ?? nested.resort_id ?? nested.resortId ?? nested.id;
  const name = nested.name ?? nested.station_name ?? nested.stationName;
  if ((typeof id !== "string" && typeof id !== "number") || typeof name !== "string") return null;
  return { id, name, slug: typeof nested.slug === "string" ? nested.slug : null };
}

async function loadEveryMapping(search = "", status = "") {
  const first = await listAnmsmStationMappings({ search, status, page: 1, per_page: 100 });
  const byId = new Map(first.items.map(item => [item.externalStationId, item]));
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const response = await listAnmsmStationMappings({ search, status, page, per_page: 100 });
    response.items.forEach(item => byId.set(item.externalStationId, item));
  }
  return { ...first, items: [...byId.values()] };
}

function ResortPicker({ item, value, onChange }: { item: AnmsmStationMapping; value: AnmsmResort | null; onChange: (value: AnmsmResort | null) => void }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<AnmsmResort[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    const timer = window.setTimeout(async () => { setLoading(true); setError(""); try { const response = await searchAnmsmResorts(query.trim()); setResults(Array.isArray(response) ? response : response.items || response.results || []); } catch (e) { setError(e instanceof Error ? e.message : "Recherche impossible."); } finally { setLoading(false); } }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);
  return <div className="anmsm-resort-picker">
    {value && <div className="anmsm-picked"><span><strong>{value.name}</strong>{value.slug ? ` · ${value.slug}` : ""}</span><button type="button" onClick={() => onChange(null)}>Modifier</button></div>}
    <label>Rechercher une station<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Saisir au moins 2 caractères" autoComplete="off" /></label>
    {loading && <small>Recherche…</small>}{error && <small className="anmsm-field-error">{error}</small>}
    {!!results.length && <ul className="anmsm-resort-results">{results.map(resort => { const unavailable = resort.linked_anmsm_station_id != null && keyOf(resort.linked_anmsm_station_id) !== item.externalStationId; return <li key={resort.id}><button type="button" disabled={unavailable} onClick={() => { onChange(resort); setQuery(""); setResults([]); }}><strong>{resort.name}</strong>{resort.slug && <span>{resort.slug}</span>}{unavailable && <em>Déjà liée à une autre station ANMSM</em>}</button></li>; })}</ul>}
  </div>;
}

export default function StationMappings({ onValidateAndPrepare }: { onValidateAndPrepare: (result: AnmsmMappingResult) => Promise<void> }) {
  const [data, setData] = useState({ items: [] as AnmsmStationMapping[], stats: EMPTY_STATS, page: 1, pages: 1, total: 0 });
  const [filter, setFilter] = useState<"" | "unmatched" | "matched">("unmatched"); const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(mappingPageSizePreference); const [choices, setChoices] = useState<Record<string, AnmsmResort | null>>({}); const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allItems, setAllItems] = useState<AnmsmStationMapping[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [confirming, setConfirming] = useState(false); const [removing, setRemoving] = useState<AnmsmStationMapping | null>(null); const [result, setResult] = useState<AnmsmMappingResult | null>(null);

  const initializeItems = useCallback((items: AnmsmStationMapping[]) => {
    setChoices(previous => {
      const next = { ...previous };
      items.forEach(item => {
        if (item.externalStationId in next) return;
        const current = mappedResort(item.mapping); const suggestion = bestSuggestion(item);
        next[item.externalStationId] = current || (isExact(suggestion) ? suggestionAsResort(suggestion!) : null);
      });
      return next;
    });
    setSelected(previous => {
      const next = new Set(previous);
      items.forEach(item => { if (!mappedResort(item.mapping) && isExact(bestSuggestion(item))) next.add(item.externalStationId); });
      return next;
    });
  }, []);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = pageSize === "all" ? await loadEveryMapping(search, filter) : await listAnmsmStationMappings({ search, status: filter, page, per_page: pageSize }); setData({ items: response.items, stats: response.stats, page: pageSize === "all" ? 1 : response.pagination.page, pages: pageSize === "all" ? 1 : Math.max(1, response.pagination.totalPages), total: response.pagination.total }); initializeItems(response.items); } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); } finally { setLoading(false); } }, [filter, initializeItems, page, pageSize, search]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void (async () => { try { const response = await loadEveryMapping(); setAllItems(response.items); initializeItems(response.items); } catch (e) { setError(e instanceof Error ? e.message : "Chargement global impossible."); } })(); }, [initializeItems]);

  const selectedRows = useMemo(() => Object.keys(choices).filter(id => selected.has(id) && choices[id]).map(id => ({ externalStationId: id, choice: choices[id]! })), [choices, selected]);
  const exactReady = allItems.filter(item => !mappedResort(item.mapping) && isExact(bestSuggestion(item)) && choices[item.externalStationId]).length;
  const manuallyChosen = allItems.filter(item => choices[item.externalStationId] && !isExact(bestSuggestion(item)) && !mappedResort(item.mapping)).length;
  const remaining = Math.max(0, allItems.length - exactReady - manuallyChosen - allItems.filter(item => mappedResort(item.mapping)).length);
  const fetchAll = async () => { const response = await loadEveryMapping(search, filter); initializeItems(response.items); return response.items; };
  const choose = (key: string, value: AnmsmResort | null) => { setChoices(previous => ({ ...previous, [key]: value })); setSelected(previous => { const next = new Set(previous); value ? next.add(key) : next.delete(key); return next; }); };
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const mappingsPayload = selectedRows.map(row => ({
        external_station_id: row.externalStationId,
        station_id: row.choice.id,
      }));
      const response = await confirmAnmsmStationMappings(mappingsPayload);
      setResult(response); setConfirming(false);

      const failedResults = Array.isArray(response.results) ? response.results.filter(item => item.ok !== true) : [];
      if (response.ok !== true || failedResults.length > 0) {
        throw new Error(`${failedResults.length || 1} correspondance(s) n’ont pas été enregistrées.`);
      }

      // Reload and verify the associations before starting the logo synchronization.
      await load();
      const refreshed = await loadEveryMapping();
      const mappedIds = new Set(refreshed.items.filter(item => mappedResort(item.mapping)).map(item => item.externalStationId));
      const missingAssociations = mappingsPayload.filter(mapping => !mappedIds.has(String(mapping.external_station_id)));
      if (missingAssociations.length > 0) {
        throw new Error(`${missingAssociations.length} correspondance(s) enregistrée(s) ne sont pas encore associées.`);
      }

      await onValidateAndPrepare(response);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation impossible. La préparation n’a pas été lancée.");
    } finally { setBusy(false); }
  };
  const remove = async () => { if (!removing) return; setBusy(true); try { await deleteAnmsmStationMapping(removing.externalStationId); setRemoving(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Suppression impossible."); } finally { setBusy(false); } };
  return <section id="correspondances" className="anmsm-mappings" aria-labelledby="mapping-title">
    <header><div><h2 id="mapping-title">Correspondances des stations</h2><p>Choisissez les associations à enregistrer, puis préparez les logos sans quitter cette page.</p></div></header>
    <div className="anmsm-mapping-summary" aria-live="polite"><strong>{exactReady} correspondances exactes prêtes</strong><strong>{manuallyChosen} correspondances choisies manuellement</strong><strong>{remaining} stations restant à associer</strong></div>
    {error && <div className="notice notice--danger" role="alert">{error}</div>}{result && (() => { const savedCount = Array.isArray(result.results) ? result.results.filter(item => item.ok === true).length : 0; const errorCount = Array.isArray(result.results) ? result.results.filter(item => item.ok !== true).length : 0; const failed = result.ok !== true || errorCount > 0; return <div className={`anmsm-result ${failed ? "anmsm-result--partial" : ""}`} role="status"><strong>{savedCount} correspondance{savedCount > 1 ? "s" : ""} enregistrée{savedCount > 1 ? "s" : ""}</strong><span>{errorCount || (failed ? 1 : 0)} erreur(s)</span>{errorCount > 0 && <ul>{result.results!.filter(item => item.ok !== true).map((item, index) => <li key={`${item.external_station_id}-${index}`}>{item.external_station_id || "Station ANMSM inconnue"} : {item.error || "Enregistrement impossible"}</li>)}</ul>}</div>; })()}
    <div className="anmsm-mapping-tools"><label>Rechercher<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label><fieldset><legend>Filtrer</legend>{[["", "Toutes"], ["unmatched", "À associer"], ["matched", "Associées"]].map(([value, label]) => <button type="button" className={filter === value ? "active" : ""} key={value} onClick={() => { setFilter(value as typeof filter); setPage(1); }}>{label}</button>)}</fieldset><label>Résultats par page :<select value={pageSize} onChange={e => { const value = e.target.value === "all" ? "all" : Number(e.target.value) as PageSize; setPageSize(value); setPage(1); mappingPageSizePreference = value; }}>{PAGE_SIZES.map(size => <option key={size}>{size}</option>)}<option value="all">Tous</option></select></label></div>
    <div className="anmsm-selection"><button className="btn btn--secondary" onClick={() => setSelected(previous => new Set([...previous, ...data.items.filter(item => choices[item.externalStationId]).map(item => item.externalStationId)]))}>Tout cocher dans les résultats affichés</button><button className="btn btn--secondary" disabled={busy} onClick={() => void (async () => { setBusy(true); try { const items = await fetchAll(); setSelected(previous => new Set([...previous, ...items.filter(item => choices[item.externalStationId] || mappedResort(item.mapping)).map(item => item.externalStationId)])); } finally { setBusy(false); } })()}>Tout cocher dans tous les résultats</button><button className="btn btn--secondary" onClick={() => setSelected(new Set())}>Tout décocher</button><button className="btn btn--primary" disabled={!selectedRows.length || busy} onClick={() => setConfirming(true)}>Valider les correspondances et préparer les logos</button></div>
    {loading ? <div className="anmsm-loading">Chargement…</div> : <div className="anmsm-mapping-table-wrap"><table className="anmsm-mapping-table"><thead><tr><th>Sélection</th><th>Station ANMSM</th><th>Correspondance proposée</th><th>Station Snow Explorer choisie et recherche manuelle</th><th>État</th></tr></thead><tbody>{data.items.map(item => { const key = item.externalStationId; const choice = choices[key] || null; const current = mappedResort(item.mapping); const suggestion = bestSuggestion(item); const exact = isExact(suggestion); return <tr key={key}><td><input type="checkbox" checked={selected.has(key)} disabled={!choice} onChange={() => setSelected(previous => { const next = new Set(previous); next.has(key) ? next.delete(key) : next.add(key); return next; })} /></td><td><div className="anmsm-station"><div className="anmsm-mini-logo">{item.logo?.url ? <img src={item.logo.url} alt="" /> : <span>Sans logo</span>}</div><div><strong>{item.externalName}</strong><small>{key}</small></div></div></td><td>{suggestion ? <div className="anmsm-best-suggestion"><strong>{suggestion.name}</strong><span className={`anmsm-suggestion ${exact ? "anmsm-suggestion--exact" : ""}`}>{exact ? "Correspondance exacte" : "Suggestion à vérifier"}</span><small>Score : {suggestion.score}</small>{!exact && <button className="btn btn--secondary" type="button" onClick={() => choose(key, suggestionAsResort(suggestion))}>Choisir cette station</button>}</div> : <span className="anmsm-no-suggestion">Aucune correspondance fiable trouvée</span>}</td><td>{current && <p>Association actuelle : <strong>{current.name}</strong></p>}<ResortPicker item={item} value={choice} onChange={value => choose(key, value)} />{!!item.mapping && <button className="btn btn--danger" onClick={() => setRemoving(item)}>Supprimer la correspondance</button>}</td><td><span className={`anmsm-status anmsm-status--${item.mapping ? "approved" : choice ? "pending" : "ignored"}`}>{item.mapping ? "Associée" : choice ? "Prête à enregistrer" : "À associer"}</span></td></tr>; })}</tbody></table></div>}
    {pageSize !== "all" && <nav className="anmsm-pagination"><button className="btn btn--secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Page précédente</button><span>Page {data.page} sur {data.pages} · {data.total} résultats</span><button className="btn btn--secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Page suivante</button></nav>}
    <AccessibleModal open={confirming} title="Valider et préparer les logos" busy={busy} onClose={() => setConfirming(false)}><div className="anmsm-modal"><p><strong>{selectedRows.length} correspondance(s)</strong> seront enregistrées, puis leurs logos seront préparés comme candidats en statut pending. Aucun logo ne sera publié.</p><div className="anmsm-modal-actions"><button className="btn btn--secondary" onClick={() => setConfirming(false)}>Annuler</button><button className="btn btn--primary" onClick={() => void submit()}>Confirmer et préparer</button></div></div></AccessibleModal>
    <AccessibleModal open={!!removing} title="Supprimer la correspondance" busy={busy} onClose={() => setRemoving(null)}><div className="anmsm-modal"><p>Cette action ne supprime ni la station ni son logo publié.</p><button className="btn btn--danger" onClick={() => void remove()}>Supprimer uniquement la correspondance</button></div></AccessibleModal>
  </section>;
}
