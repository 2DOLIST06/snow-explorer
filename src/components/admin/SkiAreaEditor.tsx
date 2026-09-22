import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import StationMultiSelect from "@/components/admin/StationMultiSelect";
import SkiAreaExpectations from "@/components/admin/catalog/SkiAreaExpectations";
import { getAdminSkiArea, saveAdminSkiArea } from "@/lib/adminSkiAreasApi";
import type { SkiAreaStatus, SkiAreaWrite, StationOption } from "@/types/skiArea";

type Form = Record<keyof Omit<SkiAreaWrite, "station_ids">, string>;
const numeric = ["altitude_min_m", "altitude_max_m", "ski_area_km", "pistes_count", "snowparks_count", "green_pistes_count", "blue_pistes_count", "red_pistes_count", "black_pistes_count", "lifts_count"] as const;
const optionalText = ["description", "cover_image_url", "piste_map_url", "snowpark_name", "forecast_open_date", "forecast_close_date", "season", "source", "verified_at"] as const;
const empty: Form = { name: "", slug: "", status: "draft", description: "", cover_image_url: "", piste_map_url: "", altitude_min_m: "", altitude_max_m: "", ski_area_km: "", pistes_count: "", snowpark_name: "", snowparks_count: "0", green_pistes_count: "", blue_pistes_count: "", red_pistes_count: "", black_pistes_count: "", lifts_count: "", forecast_open_date: "", forecast_close_date: "", season: "", source: "", verified_at: "" };

export const sumStationSnowparks = (stations: StationOption[]) => stations.reduce((total, station) => {
  const count = Number(station.snowparks_count);
  return total + (Number.isFinite(count) && count > 0 ? count : 0);
}, 0);

export default function SkiAreaEditor({ id }: { id: number | null }) {
  const router = useRouter(); const [form, setForm] = useState<Form>(empty); const [stations, setStations] = useState<StationOption[]>([]);
  const [loading, setLoading] = useState(id !== null); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  useEffect(() => { if (id === null) return; void getAdminSkiArea(id).then(({ ski_area: area }) => { const next = { ...empty } as Form; Object.keys(next).forEach(key => { const value = area[key as keyof typeof area]; next[key as keyof Form] = value == null ? "" : String(value); }); const linkedStations = area.stations || []; if (area.snowparks_count == null) next.snowparks_count = String(sumStationSnowparks(linkedStations)); setForm(next); setStations(linkedStations); }).catch(err => setError(err.message)).finally(() => setLoading(false)); }, [id]);
  const set = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const setLinkedStations = (nextStations: StationOption[]) => {
    setStations(nextStations);
    set("snowparks_count", String(sumStationSnowparks(nextStations)));
  };
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    const payload: any = { name: form.name.trim(), slug: form.slug.trim(), status: form.status as SkiAreaStatus, station_ids: stations.map(item => item.id) };
    optionalText.forEach(key => payload[key] = form[key].trim() || null);
    numeric.forEach(key => payload[key] = form[key] === "" ? null : Number(form[key]));
    try { const result = await saveAdminSkiArea(id, payload); setSaved(true); setStations(result.ski_area.stations || []); if (id === null) await router.replace(`/admin/domaines-skiables/${result.ski_area.id}`); }
    catch (err) { const issue = err as Error & { fields?: unknown }; setError(`${issue.message}${issue.fields ? ` — ${JSON.stringify(issue.fields)}` : ""}`); } finally { setSaving(false); }
  };
  if (loading) return <main className="admin-page"><p>Chargement du domaine…</p></main>;
  return <main className="admin-page"><header className="admin-page-heading"><div><p className="eyebrow">Administration</p><h1>{id === null ? "Créer un domaine skiable" : "Modifier le domaine skiable"}</h1></div><Link className="btn btn--secondary" href="/admin/domaines-skiables">Retour à la liste</Link></header>
    <form className="ski-area-form" onSubmit={submit}>
      {error && <p className="admin-form-error" role="alert">{error}</p>}{saved && <p className="admin-form-success" role="status">Domaine enregistré. Les données ont été relues depuis la réponse de l’API.</p>}
      <section><h2>Informations générales</h2><div className="admin-form-grid"><label>Nom *<input required value={form.name} onChange={e => set("name", e.target.value)} /></label><label>Slug *<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={e => set("slug", e.target.value)} /></label><label>Publication<select value={form.status} onChange={e => set("status", e.target.value)}><option value="draft">Brouillon</option><option value="published">Publié</option></select></label><label className="admin-form-wide">Description<textarea rows={7} value={form.description} onChange={e => set("description", e.target.value)} /></label></div></section>
      <section><h2>Médias</h2><div className="admin-form-grid"><label>URL de l’image principale<input type="url" value={form.cover_image_url} onChange={e => set("cover_image_url", e.target.value)} /></label><label>URL du plan des pistes<input type="url" value={form.piste_map_url} onChange={e => set("piste_map_url", e.target.value)} /></label></div></section>
      <section><h2>Caractéristiques</h2><div className="admin-form-grid"><label>Nom du snowpark<input value={form.snowpark_name} onChange={e => set("snowpark_name", e.target.value)} placeholder="Ex. The Spot" /></label>{numeric.map(key => <label key={key}>{({ altitude_min_m: "Altitude basse (m)", altitude_max_m: "Altitude haute (m)", ski_area_km: "Kilomètres de pistes", pistes_count: "Nombre total de pistes", snowparks_count: "Nombre de snowparks (total des stations)", green_pistes_count: "Pistes vertes", blue_pistes_count: "Pistes bleues", red_pistes_count: "Pistes rouges", black_pistes_count: "Pistes noires", lifts_count: "Remontées mécaniques" } as Record<string,string>)[key]}<input type="number" min="0" step="1" value={form[key]} onChange={e => set(key, e.target.value)} />{key === "snowparks_count" && <small>Pré-rempli à partir des stations rattachées, puis modifiable.</small>}</label>)}</div></section>
      <section><h2>Ouverture prévisionnelle</h2><div className="admin-form-grid"><label>Date d’ouverture<input type="date" value={form.forecast_open_date} onChange={e => set("forecast_open_date", e.target.value)} /></label><label>Date de fermeture<input type="date" value={form.forecast_close_date} onChange={e => set("forecast_close_date", e.target.value)} /></label><label>Saison<input value={form.season} onChange={e => set("season", e.target.value)} placeholder="2026-2027" /></label></div></section>
      <section><h2>Suivi interne</h2><div className="admin-form-grid"><label>Source<input value={form.source} onChange={e => set("source", e.target.value)} /></label><label>Date de vérification<input type="datetime-local" value={form.verified_at.slice(0,16)} onChange={e => set("verified_at", e.target.value)} /></label></div></section>
      <section><h2>Stations effectivement rattachées</h2><p>Seules ces relations réelles peuvent être utilisées sur le site public. Le statut actif ou inactif est affiché dans le sélecteur.</p><StationMultiSelect value={stations} onChange={setLinkedStations} /></section>
      {id !== null && <SkiAreaExpectations skiAreaId={id} />}
      <div className="admin-form-actions"><button className="btn btn--primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer le domaine"}</button></div>
    </form>
  </main>;
}
