import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ActivitiesEditor from "@/components/admin/ActivitiesEditor";
import { activitiesApi as api } from "@/lib/adminActivitiesApi";
import { emptyActivities, type ActivityTemplate } from "@/types/activities";

type Station = { id: string; slug: string; name: string; has_block: boolean; active: boolean; country_code: string; department: string; region_id: string };
type Target = { id: string; name: string; slug: string; revision: number; action: "added" | "replaced" | "ignored"; status?: string; message?: string };
type Batch = { id: string; plan: { template_name: string; mode: string; stations: Target[] }; items?: Target[]; pending?: number };
const labels: Record<string, string> = { pending: "En attente", added: "Ajouté", replaced: "Remplacé", ignored: "Ignoré", conflict: "Conflit", error: "Erreur" };
export default function ActivityTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [draft, setDraft] = useState<ActivityTemplate>({ id: "", name: "", revision: 0, block: emptyActivities() });
  const [filters, setFilters] = useState({ q: "", country_code: "", department: "", region_id: "", active: "", has_block: "" });
  const [loadingStations, setLoadingStations] = useState(true);
  const [stations, setStations] = useState<Station[]>([]); const [selected, setSelected] = useState<Station[]>([]);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(0);
  const [mode, setMode] = useState("add"); const [batch, setBatch] = useState<Batch | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { void api<{ items: ActivityTemplate[] }>("activity-templates").then(data => setTemplates(data.items)).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    let active = true; setLoadingStations(true);
    const timer = setTimeout(() => { const params = new URLSearchParams({ ...filters, page: String(page) }); void api<{ items: Station[]; pages: number }>(`activity-stations?${params}`).then(data => { if (active) { setStations(data.items); setPages(data.pages); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoadingStations(false); }); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [filters, page]);
  useEffect(() => { const id = router.query.lot; if (typeof id !== "string") return; let active = true; void api<Batch>(`activity-batches/${encodeURIComponent(id)}`).then(data => { if (active) setBatch(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [router.query.lot]);
  const action = async (fn: () => Promise<void>) => { setBusy(true); setError(""); setMessage(""); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const save = async (copy = false) => {
    const data = await api<ActivityTemplate>(`activity-templates${draft.id && !copy ? `/${draft.id}` : ""}`, draft.id && !copy ? "PUT" : "POST", { ...draft, name: copy ? `${draft.name} (copie)`.slice(0, 200) : draft.name });
    setDraft(data); setTemplates(items => [...items.filter(item => item.id !== data.id), data]); return data;
  };
  const toggle = (row: Station) => { setBatch(null); setSelected(rows => rows.some(item => item.id === row.id) ? rows.filter(item => item.id !== row.id) : [...rows, row]); };
  const run = () => action(async () => {
    if (!batch) return;
    let result: Batch;
    do {
      result = await api<Batch>(`activity-batches/${batch.id}/execute`, "POST", {});
      setBatch(result);
      if (result.items?.some(row => row.status === "error")) break;
    } while ((result.pending || 0) > 0);
    setMessage("Résultats enregistrés. Les erreurs peuvent être reprises avec le même lot ; les conflits nécessitent un nouveau récapitulatif.");
  });
  const rows = batch?.items || batch?.plan.stations || [];
  return <main className="container activities-admin"><h1>Modèles « Activités à faire »</h1><p>Les modèles sont copiés dans les stations. Leur modification ne change pas les copies déjà appliquées.</p>
    {error && <p role="alert" className="admin-form-error">{error}</p>}{message && <p role="status">{message}</p>}
    <fieldset disabled={busy}><legend>Modèle</legend><label>Ouvrir un modèle<select value={draft.id} onChange={e => { const row = templates.find(item => item.id === e.target.value); setDraft(row ? structuredClone(row) : { id: "", name: "", revision: 0, block: emptyActivities() }); setBatch(null); }}><option value="">Nouveau modèle</option>{templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Nom du modèle<input maxLength={200} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <ActivitiesEditor value={draft.block} onChange={block => { setDraft({ ...draft, block }); setBatch(null); }} />
      <div className="activity-actions"><button type="button" onClick={() => void action(async () => { await save(); setBatch(null); setMessage("Modèle enregistré."); })}>Enregistrer le modèle</button><button type="button" disabled={!draft.id} onClick={() => void action(async () => { await save(true); setBatch(null); setMessage("Modèle dupliqué."); })}>Dupliquer le modèle</button></div>
    </fieldset>
    <fieldset disabled={busy}><legend>Stations destinataires ({selected.length}/200)</legend><div className="activity-filters">{([
      ["q", "Nom ou slug"], ["country_code", "Code pays"], ["department", "Département"], ["region_id", "Identifiant de région"],
    ] as const).map(([key, label]) => <label key={key}>{label}<input value={filters[key]} onChange={e => { setFilters({ ...filters, [key]: e.target.value }); setPage(1); }} /></label>)}
      <label>État de la station<select value={filters.active} onChange={e => { setFilters({ ...filters, active: e.target.value }); setPage(1); }}><option value="">Toutes</option><option value="true">Actives</option><option value="false">Inactives</option></select></label>
      <label>Bloc d’activités<select value={filters.has_block} onChange={e => { setFilters({ ...filters, has_block: e.target.value }); setPage(1); }}><option value="">Tous</option><option value="true">Déjà présent</option><option value="false">Absent</option></select></label>
    </div><p>Les sélections sont conservées pendant la recherche et la pagination. Un bloc désactivé ou vide enregistré compte comme déjà présent.</p>
    <div className="activity-actions">{selected.map(row => <button key={row.id} type="button" onClick={() => toggle(row)}>Retirer {row.name} ×</button>)}</div>
    <button type="button" disabled={loadingStations || !stations.length} onClick={() => { setSelected(current => [...current, ...stations.filter(row => !current.some(item => item.id === row.id))].slice(0, 200)); setBatch(null); }}>Sélectionner cette page</button>
    {loadingStations && <p role="status">Recherche des stations…</p>}
    <div className="admin-option-list">{!loadingStations && stations.map(row => <label key={row.id}><input type="checkbox" checked={selected.some(item => item.id === row.id)} disabled={selected.length >= 200 && !selected.some(item => item.id === row.id)} onChange={() => toggle(row)} /><span><strong>{row.name}</strong> · {row.country_code} · {row.department} · {row.active ? "active" : "inactive"} · {row.has_block ? "Bloc déjà présent" : "Sans bloc"}</span></label>)}</div>
    <div className="activity-actions"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</button><span>Page {page} / {pages || 1}</span><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivant</button></div>
    <label>Mode d’application<select aria-label="Mode d’application" value={mode} onChange={e => { setMode(e.target.value); setBatch(null); }}><option value="add">Ajouter uniquement sur les stations sans bloc</option><option value="replace">Remplacer le bloc existant sur les stations sélectionnées</option></select></label>
    {mode === "replace" && <p>Les blocs présents seront remplacés par la copie du modèle ; vérifiez le récapitulatif avant de lancer.</p>}
    <button type="button" disabled={!selected.length} onClick={() => void action(async () => { const saved = await save(); const prepared = await api<Batch>(`activity-templates/${saved.id}/prepare`, "POST", { revision: saved.revision, mode, station_ids: selected.map(row => row.id) }); setBatch(prepared); await router.replace({ pathname: router.pathname, query: { lot: prepared.id } }, undefined, { shallow: true }); })}>Enregistrer le modèle et préparer le récapitulatif</button>
    </fieldset>
    {batch && <section aria-live="polite"><h2>Lot : {batch.plan.template_name}</h2><p>Mode : {batch.plan.mode === "add" ? "ajout uniquement" : "remplacement explicite"}. {rows.filter(row => row.action === "added").length} ajouts, {rows.filter(row => row.action === "replaced").length} remplacements, {rows.filter(row => row.action === "ignored").length} stations ignorées.</p>
      <p>Ce récapitulatif conserve une copie du modèle. Conservez <a href={`/admin/activites?lot=${batch.id}`}>ce lien de reprise du lot</a> en cas d’interruption.</p>
      <ul>{rows.map(row => <li key={row.id}><a href={`/admin/stations/${row.slug}`}>{row.name}</a> — {row.status ? labels[row.status] : row.action === "replaced" ? "À remplacer" : row.action === "added" ? "À ajouter" : "À ignorer"}{row.message ? ` : ${row.message}` : ""}</li>)}</ul>
      <button type="button" disabled={busy || Boolean(batch.items && !batch.items.some(row => row.status === "pending" || row.status === "error"))} onClick={() => void run()}>{busy ? "Application en cours…" : batch.items?.some(row => row.status !== "pending") ? "Reprendre les stations en attente ou en erreur" : batch.plan.mode === "replace" ? "Confirmer et appliquer les remplacements" : "Lancer les ajouts"}</button>
    </section>}
  </main>;
}
