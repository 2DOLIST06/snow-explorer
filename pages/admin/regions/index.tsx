import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/adminApi";
import { parseRegionsPayload } from "@/lib/api/regions";
import type { RegionSummary } from "@/lib/regions";

export default function AdminRegions() {
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { void (async () => {
    try {
      let response = await adminFetch("/api/admin/regions", { cache: "no-store" });
      if (response.status === 404) response = await adminFetch("/api/regions", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json(); setRegions(parseRegionsPayload(payload));
    } catch (err) { setError(err instanceof Error ? err.message : "Chargement impossible"); } finally { setLoading(false); }
  })(); }, []);
  return <main className="admin-region-page"><header><div><p className="eyebrow">Référencement</p><h1>Pages des régions</h1><p>Rédigez le contenu SEO affiché avant la liste des stations de chaque région.</p></div><Link className="btn btn--secondary" href="/admin/stations">Retour aux stations</Link></header>
    {error && <p className="notice notice--danger">Impossible de charger les régions : {error}</p>}
    {loading && <p role="status">Chargement des régions…</p>}{!loading && !error && !regions.length && <p>Aucune région disponible.</p>}
    <div className="admin-region-list">{regions.map((region) => <Link key={region.id || region.name} href={`/admin/regions/${encodeURIComponent(region.id || "")}`}><strong>{region.name || region.id}</strong><span>Modifier le texte et les balises SEO →</span></Link>)}</div>
  </main>;
}
