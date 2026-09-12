import Link from "next/link";
import { useEffect, useState } from "react";
import { getStationSkiAreas, listAdminSkiAreas, replaceStationSkiAreas } from "@/lib/adminSkiAreasApi";
import type { SkiAreaAdmin } from "@/types/skiArea";

export default function StationSkiAreas({ stationId }: { stationId: string }) {
  const [selected, setSelected] = useState<SkiAreaAdmin[]>([]), [results, setResults] = useState<SkiAreaAdmin[]>([]), [q, setQ] = useState(""), [page, setPage] = useState(1), [pages, setPages] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  useEffect(() => { void getStationSkiAreas(stationId).then(data => setSelected(data.ski_areas)).catch(err => setError(err.message)); }, [stationId]);
  useEffect(() => { const timer = setTimeout(() => void listAdminSkiAreas({ page, per_page: 20, q }).then(data => { setResults(data.items); setPages(data.pagination.pages); }).catch(err => setError(err.message)), 250); return () => clearTimeout(timer); }, [page, q]);
  const ids = new Set(selected.map(item => item.id));
  const toggle = (item: SkiAreaAdmin) => setSelected(current => ids.has(item.id) ? current.filter(row => row.id !== item.id) : [...current, item]);
  const save = async () => { setBusy(true); setError(""); setSaved(false); try { const data = await replaceStationSkiAreas(stationId, selected.map(item => item.id)); setSelected(data.ski_areas); setSaved(true); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } };
  return <section className="station-admin-domains"><h2>Domaines skiables</h2><p>Une station peut appartenir à plusieurs domaines. Les caractéristiques restent gérées sur chaque domaine.</p>
    {error && <p className="admin-form-error" role="alert">{error}</p>}{saved && <p className="admin-form-success" role="status">Rattachements enregistrés.</p>}
    {selected.length > 0 && <ul>{selected.map(area => <li key={area.id}><span><strong>{area.name}</strong> · {area.status === "published" ? "Publié" : "Brouillon"}</span><Link href={`/admin/domaines-skiables/${area.id}`}>Modifier le domaine</Link><button type="button" onClick={() => toggle(area)}>Retirer</button></li>)}</ul>}
    <label>Rechercher un domaine<input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></label><div className="admin-option-list">{results.map(area => <label key={area.id}><input type="checkbox" checked={ids.has(area.id)} onChange={() => toggle(area)} /><span><strong>{area.name}</strong><small>{area.status === "published" ? "Publié" : "Brouillon"}</small></span></label>)}</div>
    <div className="admin-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Précédent</button><span>Page {page}{pages ? ` sur ${pages}` : ""}</span><button type="button" disabled={!pages || page >= pages} onClick={() => setPage(v => v + 1)}>Suivant</button></div><button type="button" className="btn btn--primary" disabled={busy} onClick={() => void save()}>{busy ? "Enregistrement…" : "Enregistrer les rattachements"}</button>
  </section>;
}
