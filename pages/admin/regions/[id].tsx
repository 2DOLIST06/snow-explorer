import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import RegionHtmlEditor from "@/components/admin/RegionHtmlEditor";
import { regionDescription, cleanRegionHtml } from "@/lib/regionHtml";
import { adminFetch } from "@/lib/adminApi";
import { regionHref, type RegionSummary } from "@/lib/regions";

export default function AdminRegionEditor() {
  const router = useRouter(); const id = typeof router.query.id === "string" ? router.query.id : "";
  const [saving, setSaving] = useState(false);
  const [region, setRegion] = useState<RegionSummary | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { if (!id) return; let cancelled = false; setRegion(null); setError(""); setMessage(""); void (async () => { try {
    let response = await adminFetch(`/api/admin/regions/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 404) response = await adminFetch(`/api/regions/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`); const payload = await response.json(); if (!cancelled) setRegion(payload.region || payload.data || payload);
  } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Chargement impossible"); } })(); return () => { cancelled = true; }; }, [id]);
  const update = (field: keyof RegionSummary, value: string) => setRegion((current) => current ? { ...current, [field]: value } : current);
  const save = async () => { if (!region || saving) return; setSaving(true); setError(""); setMessage("Enregistrement…"); try {
    const body = JSON.stringify({ description_html: cleanRegionHtml(regionDescription(region)), meta_title: region.meta_title || "", meta_description: region.meta_description || "" });
    let response = await adminFetch(`/api/admin/regions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    if (response.status === 404) response = await adminFetch(`/api/regions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    if (!response.ok) { const detail = await response.text(); throw new Error(`Enregistrement impossible (HTTP ${response.status}) : ${detail.slice(0, 1000)}`); } setRegion(current => current ? { ...current, description_html: cleanRegionHtml(regionDescription(current)) } : current); setMessage("Contenu SEO enregistré.");
  } catch (err) { setMessage(""); setError(err instanceof Error ? err.message : "Enregistrement impossible"); } finally { setSaving(false); } };
  if (!region) return <main className="admin-region-page">{error ? <p className="notice notice--danger">{error}</p> : <p>Chargement…</p>}</main>;
  return <main className="admin-region-page"><header><div><p className="eyebrow">Éditeur SEO</p><h1>{region.name}</h1></div><div className="admin-region-actions"><Link className="btn btn--secondary" href="/admin/regions">Toutes les régions</Link>{regionHref(region) && <Link className="btn btn--secondary" target="_blank" rel="noopener noreferrer" href={regionHref(region)!}>Voir la page</Link>}<button className="btn btn--primary" type="button" disabled={saving} onClick={() => void save()}>Enregistrer</button></div></header>
    {message && <p className="notice notice--info" aria-live="polite">{message}</p>}{error && <p className="notice notice--danger">{error}</p>}
    <section className="admin-region-editor"><label>Titre SEO <input disabled={saving} value={region.meta_title || ""} maxLength={70} onChange={(e) => update("meta_title", e.target.value)} /><small>{(region.meta_title || "").length}/70 caractères</small></label><label>Méta-description <textarea disabled={saving} rows={3} value={region.meta_description || ""} maxLength={170} onChange={(e) => update("meta_description", e.target.value)} /><small>{(region.meta_description || "").length}/170 caractères</small></label><div><p>Description de la région</p><RegionHtmlEditor key={id} value={regionDescription(region)} onChange={(html) => { update("description_html", html); setMessage(""); }} disabled={saving} /><small>Ce contenu apparaît après le H1 et avant les stations.</small></div></section>
  </main>;
}
