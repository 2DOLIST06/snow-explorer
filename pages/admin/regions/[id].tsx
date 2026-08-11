import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { adminFetch } from "@/lib/adminApi";
import { regionHref, type RegionSummary } from "@/lib/regions";

export default function AdminRegionEditor() {
  const router = useRouter(); const id = typeof router.query.id === "string" ? router.query.id : "";
  const [region, setRegion] = useState<RegionSummary | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { if (!id) return; void (async () => { try {
    let response = await adminFetch(`/api/admin/regions/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 404) response = await adminFetch(`/api/regions/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`); const payload = await response.json(); setRegion(payload.region || payload);
  } catch (err) { setError(err instanceof Error ? err.message : "Chargement impossible"); } })(); }, [id]);
  const update = (field: keyof RegionSummary, value: string) => setRegion((current) => current ? { ...current, [field]: value } : current);
  const save = async () => { if (!region) return; setError(""); setMessage("Enregistrement…"); try {
    const body = JSON.stringify({ seo_text: region.seo_text || "", meta_title: region.meta_title || "", meta_description: region.meta_description || "" });
    let response = await adminFetch(`/api/admin/regions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    if (response.status === 404) response = await adminFetch(`/api/regions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    if (!response.ok) throw new Error(`Enregistrement impossible (HTTP ${response.status})`); setMessage("Contenu SEO enregistré.");
  } catch (err) { setMessage(""); setError(err instanceof Error ? err.message : "Enregistrement impossible"); } };
  if (!region) return <main className="admin-region-page">{error ? <p className="notice notice--danger">{error}</p> : <p>Chargement…</p>}</main>;
  return <main className="admin-region-page"><header><div><p className="eyebrow">Éditeur SEO</p><h1>{region.name}</h1></div><div className="admin-region-actions"><Link className="btn btn--secondary" href="/admin/regions">Toutes les régions</Link>{regionHref(region) && <Link className="btn btn--secondary" target="_blank" href={regionHref(region)!}>Voir la page</Link>}<button className="btn btn--primary" type="button" onClick={() => void save()}>Enregistrer</button></div></header>
    {message && <p className="notice notice--info" aria-live="polite">{message}</p>}{error && <p className="notice notice--danger">{error}</p>}
    <section className="admin-region-editor"><label>Titre SEO <input value={region.meta_title || ""} maxLength={70} onChange={(e) => update("meta_title", e.target.value)} /><small>{(region.meta_title || "").length}/70 caractères</small></label><label>Méta-description <textarea rows={3} value={region.meta_description || ""} maxLength={170} onChange={(e) => update("meta_description", e.target.value)} /><small>{(region.meta_description || "").length}/170 caractères</small></label><label>Texte SEO de la page <textarea rows={16} value={region.seo_text || region.description_html || ""} onChange={(e) => update("seo_text", e.target.value)} placeholder="Présentez la région, ses massifs et ses stations. Séparez les paragraphes par une ligne vide." /><small>Ce texte apparaît sous les stations. Une ligne vide crée un nouveau paragraphe.</small></label></section>
  </main>;
}
