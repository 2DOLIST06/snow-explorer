import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnmsmApiError, bulkApproveAnmsmLogos, confirmAnmsmStationMappings, getAnmsmWorkspace, prepareAnmsmLogo, searchAnmsmResorts } from "@/lib/api/anmsmLogos";
import { EMPTY_ANMSM_STATS, filterAnmsmRowsReadyToPublish, isAnmsmRowReadyToPublish, paginateAnmsmRows } from "@/lib/anmsmWorkspace";
import type { AnmsmWorkspace, AnmsmWorkspaceRow, AnmsmResort } from "@/types/anmsmLogo";

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const DEFAULT_PAGE_SIZE = 20;
type RowFilter = "all" | "ready" | "prepare" | "mapping" | "published" | "error" | "source-missing";
const FILTERS: Array<{ value: RowFilter; label: string }> = [
  { value: "all", label: "Tous" }, { value: "mapping", label: "À associer" }, { value: "ready", label: "Prêts à publier" },
  { value: "prepare", label: "À préparer" }, { value: "published", label: "Déjà publiés" }, { value: "error", label: "Erreurs" },
  { value: "source-missing", label: "Sans logo source" },
];
const canPublish = isAnmsmRowReadyToPublish;
const nonEmptyUrl = (value: string | null | undefined) => value?.trim() || null;
const sourceLogoUrl = (row: AnmsmWorkspaceRow) => nonEmptyUrl(row.source_logo_url) || nonEmptyUrl(row.source_url);
const needsPreparation = (row: AnmsmWorkspaceRow) => row.station_id !== null && row.source_has_logo === true && row.preparation_required === true;
const errorText = (error: unknown) => error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
const hasPreparationError = (row: AnmsmWorkspaceRow) => !!row.preparation_error || row.candidate_status === "error";
const isPublished = (row: AnmsmWorkspaceRow) => row.candidate_status === "approved" && nonEmptyUrl(row.current_logo_url) !== null;
const hasNoSource = (row: AnmsmWorkspaceRow) => row.source_has_logo !== true || !sourceLogoUrl(row);
const rowStatus = (row: AnmsmWorkspaceRow, preparing?: boolean) => preparing ? "Préparation…" : canPublish(row) ? "Prêt à publier" : isPublished(row) ? "Déjà publié" : hasPreparationError(row) ? "Erreur" : row.station_id === null ? "À associer" : hasNoSource(row) ? "Sans logo source" : "À préparer";
const rowCategory = (row: AnmsmWorkspaceRow): Exclude<RowFilter, "all"> => canPublish(row) ? "ready" : isPublished(row) ? "published" : hasPreparationError(row) ? "error" : row.station_id === null ? "mapping" : hasNoSource(row) ? "source-missing" : "prepare";
const matchesFilter = (row: AnmsmWorkspaceRow, filter: RowFilter) => filter === "all"
  || (filter === "mapping" && row.station_id === null)
  || (filter === "ready" && canPublish(row))
  || (filter === "prepare" && needsPreparation(row))
  || (filter === "published" && isPublished(row))
  || (filter === "error" && hasPreparationError(row))
  || (filter === "source-missing" && hasNoSource(row));
const DISPLAY_ORDER: Record<Exclude<RowFilter, "all">, number> = { ready: 1, prepare: 2, "source-missing": 3, mapping: 4, error: 5, published: 6 };

function LogoImage({ src, alt, emptyText, linked = false, onExpired }: { src: string | null | undefined; alt: string; emptyText: string; linked?: boolean; onExpired?: () => void }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => setState("loading"), [src]);
  return <div className="anmsm-logo-image">
    {src && state !== "failed" && (linked ? <a href={src} target="_blank" rel="noreferrer" aria-label={`Agrandir : ${alt}`}><img src={src} alt={alt} onLoad={() => setState("ready")} onError={() => { setState("failed"); onExpired?.(); }} /></a> : <img src={src} alt={alt} onLoad={() => setState("ready")} onError={() => { setState("failed"); onExpired?.(); }} />)}
    {src && state === "loading" && <span>Chargement…</span>}
    {(!src || state === "failed") && <span>{src ? "Image indisponible" : emptyText}</span>}
  </div>;
}

function MappingCell({ row, onMapped }: { row: AnmsmWorkspaceRow; onMapped: (row: AnmsmWorkspaceRow, resort: AnmsmResort) => Promise<void> }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<AnmsmResort[]>([]); const [busy, setBusy] = useState(false);
  const search = async (value: string) => { setQuery(value); if (value.trim().length < 2) return setResults([]); try { setResults((await searchAnmsmResorts(value.trim())).items); } catch { setResults([]); } };
  if (row.station_id !== null) return <div><strong>{row.station_name || "Station inconnue"}</strong><small>{row.station_id}</small>{row.mapping_status && <small>{row.mapping_status}</small>}</div>;
  const suggestion = row.suggestion;
  return <div className="anmsm-inline-picker">
    <strong>Aucune station Snow Explorer associée</strong>
    {suggestion && <button type="button" disabled={busy} onClick={() => void onMapped(row, suggestion)}><strong>Suggestion à vérifier : {suggestion.station_name}</strong></button>}
    <label>Rechercher une station Snow Explorer<input value={query} onChange={event => void search(event.target.value)} disabled={busy} /></label>
    {results.length > 0 && <ul>{results.map(resort => <li key={resort.station_id}><button type="button" disabled={busy} onClick={() => { setBusy(true); void onMapped(row, resort).finally(() => setBusy(false)); }}>{resort.station_name}<small>{resort.station_id}</small></button></li>)}</ul>}
  </div>;
}

export default function AnmsmLogosAdmin() {
  const [rows, setRows] = useState<AnmsmWorkspaceRow[]>([]); const [stats, setStats] = useState(EMPTY_ANMSM_STATS); const [loaded, setLoaded] = useState(false); const [selected, setSelected] = useState<Set<number>>(new Set());
  const [preparingId, setPreparingId] = useState<string | null>(null); const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [stopped, setStopped] = useState(false); const stopRequested = useRef(false); const running = useRef(false);
  const [notice, setNotice] = useState(""); const [apiError, setApiError] = useState(""); const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<RowFilter>("all"); const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState<number | "all">(DEFAULT_PAGE_SIZE);

  const replaceRow = useCallback((item: AnmsmWorkspaceRow) => setRows(current => current.map(row => row.external_station_id === item.external_station_id ? item : row)), []);
  const refresh = useCallback(async () => { try { const data = await getAnmsmWorkspace(); setRows(data.rows); setStats(data.stats); setLoaded(true); setApiError(data.contractError || ""); return data; } catch (error) { setApiError(`API indisponible : ${errorText(error)}`); return null; } }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const prepareOne = useCallback(async (row: AnmsmWorkspaceRow) => {
    setPreparingId(row.external_station_id); let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { const response = await prepareAnmsmLogo(row.external_station_id); replaceRow(response.item); setRowErrors(errors => { const next = { ...errors }; delete next[row.external_station_id]; return next; }); return true; }
      catch (error) { lastError = error; const retryable = !(error instanceof AnmsmApiError) || error.status === 0 || error.status === 502; if (!retryable || attempt === 2) break; await delay(350 * (attempt + 1)); }
    }
    setRowErrors(errors => ({ ...errors, [row.external_station_id]: `Préparation échouée : ${errorText(lastError)}` })); return false;
  }, [replaceRow]);

  const runPreparation = useCallback(async (data: AnmsmWorkspace) => {
    if (running.current) return; running.current = true; stopRequested.current = false; setStopped(false);
    const queue = data.rows.filter(needsPreparation); let errors = 0; setProgress({ done: 0, total: queue.length, errors: 0 });
    for (let index = 0; index < queue.length; index += 1) {
      if (stopRequested.current) { setStopped(true); break; }
      if (!await prepareOne(queue[index])) errors += 1;
      setProgress({ done: index + 1, total: queue.length, errors });
    }
    setPreparingId(null); running.current = false;
  }, [prepareOne]);

  const retrieve = async () => { const data = await refresh(); if (data) await runPreparation(data); };
  const map = async (row: AnmsmWorkspaceRow, resort: AnmsmResort) => {
    try {
      const payload = { external_station_id: row.external_station_id, station_id: resort.station_id };
      const result = await confirmAnmsmStationMappings([payload]);
      const failure = result.results?.find(item => !item.ok); if (!result.ok || failure) throw new Error(failure?.error || "Association invalide.");
      const data = await refresh(); const updated = data?.rows.find(item => item.external_station_id === row.external_station_id); if (updated && needsPreparation(updated)) await prepareOne(updated);
    } catch (error) { setRowErrors(errors => ({ ...errors, [row.external_station_id]: `Association invalide : ${errorText(error)}` })); }
  };
  const publish = async () => {
    const candidate_ids = [...selected]; if (!candidate_ids.length || !window.confirm(`Publier ${candidate_ids.length} logos sélectionnés ? Les anciens logos seront conservés.`)) return;
    try {
      const result = await bulkApproveAnmsmLogos(candidate_ids); const succeeded = new Set(result.results.filter(item => item.ok).map(item => item.candidate_id));
      setRows(current => current.map(row => row.candidate_id !== null && succeeded.has(row.candidate_id) ? { ...row, candidate_status: "approved", current_logo_url: row.candidate_preview_url, mapping: row.mapping && { ...row.mapping, current_logo_url: row.candidate_preview_url }, candidate: row.candidate && { ...row.candidate, status: "published" } } : row));
      setSelected(current => new Set([...current].filter(id => !succeeded.has(id))));
      setRowErrors(errors => ({ ...errors, ...Object.fromEntries(result.results.filter(item => !item.ok).map(item => [String(item.candidate_id), `Publication échouée : ${item.error || "Erreur inconnue"}`])) }));
      setNotice(result.failed ? `${result.succeeded} logo(s) publié(s), ${result.failed} échec(s).` : `${result.succeeded} logos ont été publiés. Les anciens logos ont été conservés.`);
    } catch (error) { setNotice(`Publication échouée : ${errorText(error)}`); }
  };
  const allRows = useMemo<AnmsmWorkspaceRow[]>(() => Array.isArray(rows) ? rows.filter(Boolean) : [], [rows]);
  const filteredRows = useMemo(() => allRows.filter(row => matchesFilter(row, filter)).sort((a, b) => DISPLAY_ORDER[rowCategory(a)] - DISPLAY_ORDER[rowCategory(b)]), [allRows, filter]);
  const effectivePageSize = pageSize === "all" ? Math.max(1, filteredRows.length) : pageSize;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / effectivePageSize)); const currentPage = Math.min(page, pageCount);
  const visibleRows = useMemo(() => paginateAnmsmRows(filteredRows, currentPage, effectivePageSize), [filteredRows, currentPage, effectivePageSize]);
  const ready = useMemo(() => filterAnmsmRowsReadyToPublish(allRows), [allRows]);
  const resumeRows = allRows.some(needsPreparation);
  return <main className="anmsm-admin">
    <header className="anmsm-hero"><div><p className="eyebrow">Administration</p><h1>Logos officiels ANMSM</h1></div><button className="btn btn--primary" disabled={running.current} title={running.current ? "Une préparation est déjà en cours" : undefined} onClick={() => void retrieve()}>Récupérer les logos ANMSM</button></header>
    <section className="anmsm-summary" aria-label="Résumé"><div><strong>{stats.stations_received}</strong><span>Stations reçues</span></div><div><strong>{stats.stations_matched}</strong><span>Stations associées</span></div><div><strong>{stats.stations_unmatched}</strong><span>Stations restant à associer</span></div><div><strong>{stats.logos_available}</strong><span>Logos disponibles</span></div><div><strong>{stats.logos_without_source}</strong><span>Logos sans source</span></div><div><strong>{stats.candidates_pending}</strong><span>Candidats en attente</span></div><div><strong>{stats.candidates_approved}</strong><span>Candidats approuvés</span></div><div><strong>{stats.candidates_in_error}</strong><span>Candidats en erreur</span></div><div><strong>{stats.candidates_to_prepare}</strong><span>Candidats à préparer</span></div></section>
    {apiError && <p className="notice notice--danger" role="alert">{apiError}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {(running.current || stopped || progress.total > 0) && <section className="anmsm-progress" aria-live="polite"><strong>Préparation des logos : {progress.done} sur {progress.total}</strong><progress value={progress.done} max={progress.total || 1} aria-label={`Préparation des logos : ${progress.done} sur ${progress.total}`} /><span>{preparingId ? rows.find(row => row.external_station_id === preparingId)?.external_station_name : "En attente"} · {progress.errors} erreur(s)</span>{running.current ? <button className="btn btn--secondary" onClick={() => { stopRequested.current = true; }}>Arrêter</button> : stopped && resumeRows ? <button className="btn btn--secondary" onClick={() => void runPreparation({ rows, stats, contractError: null })}>Reprendre</button> : null}</section>}
    {loaded && <><section className="anmsm-filters" aria-label="Filtrer les logos">{FILTERS.map(item => <button key={item.value} type="button" className={`btn ${filter === item.value ? "btn--primary" : "btn--secondary"}`} aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setPage(1); }}>{item.label}</button>)}</section>
    <section className="anmsm-selection"><button className="btn btn--secondary" onClick={() => setSelected(new Set(ready.map(row => row.candidate!.candidate_id)))}>Tout sélectionner les logos prêts</button><button className="btn btn--secondary" onClick={() => setSelected(new Set())}>Tout décocher</button><strong>{selected.size} logo(s) sélectionné(s)</strong><button className="btn btn--primary" disabled={!selected.size} title={!selected.size ? "Sélectionnez au moins un logo prêt" : undefined} onClick={() => void publish()}>Publier les logos sélectionnés</button></section>
    <div className="anmsm-table-wrap"><table className="anmsm-table"><thead><tr><th>Sélection</th><th>Station ANMSM</th><th>Station Snow Explorer associée</th><th>Logo disponible chez ANMSM</th><th>Logo actuellement publié</th><th>Nouveau logo optimisé</th><th>Poids et avertissements</th><th>État</th></tr></thead><tbody>{visibleRows.map(row => {
      const candidate = row.candidate; const selectable = canPublish(row); const id = row.candidate_id; const stationLabel = row.anmsm_station_name?.trim() || "Station inconnue"; const sourceUrl = sourceLogoUrl(row);
      const error = rowErrors[row.external_station_id] || (id ? rowErrors[String(id)] : "") || row.preparation_error || candidate?.error_message;
      const optimizedEmptyText = row.preparation_required === true ? "Logo ANMSM disponible — préparation nécessaire" : row.source_has_logo === true && sourceUrl && row.station_id === null ? "Associer la station avant préparation" : "Aucun logo à préparer";
      return <tr key={row.external_station_id}>
        <td data-label="Sélection"><label><span className="sr-only">Sélectionner le logo de {stationLabel}</span><input type="checkbox" disabled={!selectable} checked={!!id && selected.has(id)} onChange={() => id && setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; })} /></label></td>
        <td data-label="Station"><strong>{stationLabel}</strong><small>{row.external_station_id}</small>{row.anmsm_title && <small>{row.anmsm_title}</small>}</td>
        <td data-label="Station associée"><MappingCell row={row} onMapped={map} /></td>
        <td data-label="Logo source"><LogoImage src={row.source_has_logo === true ? sourceUrl : null} alt={`Logo ANMSM de ${stationLabel}`} emptyText="Aucun logo fourni par ANMSM" linked />{row.source_has_logo === true && sourceUrl && <small>Logo disponible chez ANMSM</small>}</td>
        <td data-label="Logo publié"><LogoImage src={row.current_logo_url} alt={`Logo actuellement publié de ${stationLabel}`} emptyText="Aucun logo publié" /></td>
        <td data-label="Nouveau logo"><LogoImage src={row.candidate_preview_url} alt={`Nouveau logo optimisé de ${stationLabel}`} emptyText={optimizedEmptyText} onExpired={() => void refresh()} /></td>
        <td data-label="Poids et avertissements"><strong>{candidate?.optimized_size_bytes == null ? "—" : `${(candidate.optimized_size_bytes / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko`}</strong>{candidate?.warnings.map(warning => <small key={`${warning.code}-${warning.message}`}>{warning.message || warning.code}</small>)}</td>
        <td data-label="État"><span className={`anmsm-status anmsm-status--${rowStatus(row, preparingId === row.external_station_id) === "Erreur" ? "error" : "ready"}`}>{rowStatus(row, preparingId === row.external_station_id)}</span>{error && <small className="anmsm-row-error" role="alert">{error}</small>}</td>
      </tr>;
    })}</tbody></table></div>
    {filteredRows.length === 0 ? <p className="notice">Aucun logo à afficher.</p> : <nav className="anmsm-pagination" aria-label="Pagination"><label>Résultats par page <select value={pageSize} onChange={event => { const value = event.target.value; setPageSize(value === "all" ? "all" : Number(value)); setPage(1); }}><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option><option value="all">Tous</option></select></label><span>{filteredRows.length} résultat(s)</span><button className="btn btn--secondary" disabled={currentPage <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Précédent</button><strong>Page {currentPage} sur {pageCount}</strong><button className="btn btn--secondary" disabled={currentPage >= pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Suivant</button></nav>}</>}
  </main>;
}
