import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cleanRegionHtml, getRegionDescription } from "@/lib/regionHtml";
const RegionHtmlEditor = dynamic(() => import("@/components/admin/RegionHtmlEditor"), { ssr: false, loading: () => <p>Chargement de l’éditeur…</p> });
import { adminFetch } from "@/lib/adminApi";
import { regionHref, type RegionSummary } from "@/lib/regions";

export default function AdminRegionEditor() {
  const router = useRouter(); const id = typeof router.query.id === "string" ? router.query.id : "";
  const [saving, setSaving] = useState(false);
  const [region, setRegion] = useState<RegionSummary | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { setRegion(null); setMessage(""); setError(""); if (!id) return; let cancelled = false; void (async () => { try {
    let response = await adminFetch(`/api/admin/regions/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 404) response = await adminFetch(`/api/regions/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`); const payload = await response.json(); const loaded = payload.region || payload; if (!cancelled) setRegion({ ...loaded, description_html: getRegionDescription(loaded) });
  } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Chargement impossible"); } })(); return () => { cancelled = true; }; }, [id]);
  const update = (field: keyof RegionSummary, value: string) => setRegion((current) => current ? { ...current, [field]: value } : current);
  const save = async () => { if (!region || saving) return; setSaving(true); setError(""); setMessage("Enregistrement…"); try {
    const body = JSON.stringify({ description_html: cleanRegionHtml(getRegionDescription(region)), meta_title: region.meta_title || "", meta_description: region.meta_description || "" });
    let response = await adminFetch(`/api/admin/regions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    if (response.status === 404) response = await adminFetch(`/api/regions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    if (!response.ok) throw new Error(`Enregistrement impossible (HTTP ${response.status})`); update("description_html", cleanRegionHtml(getRegionDescription(region))); setMessage("Contenu SEO enregistré.");
  } catch (err) { setMessage(""); setError(err instanceof Error ? err.message : "Enregistrement impossible"); } finally { setSaving(false); } };
  if (!region) return <main className="admin-region-page">{error ? <p className="notice notice--danger">{error}</p> : <p>Chargement…</p>}</main>;
  return <main className="admin-region-page"><header><div><p className="eyebrow">Éditeur SEO</p><h1>{region.name}</h1></div><div className="admin-region-actions"><Link className="btn btn--secondary" href="/admin/regions">Toutes les régions</Link>{regionHref(region) && <Link className="btn btn--secondary" target="_blank" rel="noopener noreferrer" href={regionHref(region)!}>Voir la page</Link>}<button className="btn btn--primary" type="button" disabled={saving} onClick={() => void save()}>Enregistrer</button></div></header>
    {message && <p className="notice notice--info" aria-live="polite">{message}</p>}{error && <p className="notice notice--danger">{error}</p>}
    <section className="admin-region-editor"><label>Titre SEO <input disabled={saving} value={region.meta_title || ""} maxLength={70} onChange={(e) => update("meta_title", e.target.value)} /><small>{(region.meta_title || "").length}/70 caractères</small></label><label>Méta-description <textarea disabled={saving} rows={3} value={region.meta_description || ""} maxLength={170} onChange={(e) => update("meta_description", e.target.value)} /><small>{(region.meta_description || "").length}/170 caractères</small></label><div><p id="region-description-label">Description de la région</p><RegionHtmlEditor key={id} disabled={saving} value={getRegionDescription(region)} onChange={(html) => update("description_html", html)} /><small>Ce contenu apparaît sous le H1, avant les stations. Entrée crée un paragraphe ; Maj + Entrée insère un saut de ligne.</small></div></section>
  </main>;
}
