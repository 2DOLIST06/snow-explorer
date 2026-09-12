import { useEffect, useState } from "react";
import { listStationOptions } from "@/lib/adminSkiAreasApi";
import type { StationOption } from "@/types/skiArea";

export default function StationMultiSelect({ value, onChange }: { value: StationOption[]; onChange: (stations: StationOption[]) => void }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<StationOption[]>([]);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      void listStationOptions({ page, q }).then(data => { setItems(data.items); setPages(data.pagination.pages); }).catch(err => setError(err.message)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [page, q]);
  const selected = new Set(value.map(item => item.id));
  const toggle = (item: StationOption) => onChange(selected.has(item.id) ? value.filter(row => row.id !== item.id) : [...value, item]);
  return <section className="admin-relation-picker">
    <h2>Stations rattachées</h2>
    <p>Les sélections sont conservées pendant la recherche et la pagination.</p>
    {value.length > 0 && <div className="admin-selected-chips">{value.map(item => <button type="button" key={item.id} onClick={() => toggle(item)}>{item.name} ({item.is_active === false ? "inactive" : "active"}) <span aria-hidden>×</span><span className="sr-only">Retirer</span></button>)}</div>}
    <label>Rechercher une station<input value={q} onChange={event => { setQ(event.target.value); setPage(1); }} placeholder="Nom ou slug" /></label>
    {loading && <p aria-live="polite">Chargement des stations…</p>}
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    {!loading && <div className="admin-option-list">{items.map(item => <label key={item.id}><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item)} /><span><strong>{item.name}</strong><small>{item.slug} · {item.is_active === false ? "inactive" : "active"}</small></span></label>)}</div>}
    <div className="admin-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Précédent</button><span>Page {page}{pages ? ` sur ${pages}` : ""}</span><button type="button" disabled={!pages || page >= pages} onClick={() => setPage(v => v + 1)}>Suivant</button></div>
  </section>;
}
