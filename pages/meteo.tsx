import React, { useEffect, useMemo, useState } from "react";
import SkiWeatherWidget from "@/components/SkiWeatherWidget";

type Resort = { id?: string; name: string; slug: string; region?: { name?: string }; latitude?: number | null; longitude?: number | null };
type StationWidgets = { meteo?: { enabled?: boolean; iframeUrl?: string | null; iframe_url?: string | null }; widgets?: { meteo?: { enabled?: boolean; iframeUrl?: string | null; iframe_url?: string | null } } };

export default function MeteoPage() {
  const [q, setQ] = useState("");
  const [stations, setStations] = useState<Resort[]>([]);
  const [selected, setSelected] = useState<Resort | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [loadingWidget, setLoadingWidget] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function loadAllStations() {
      setLoadingStations(true);
      try {
        const [adminRes, publicRes] = await Promise.all([fetch("/api/ski/stations").catch(() => null), fetch("/api/ski/resorts/").catch(() => null)]);
        const adminPayload = adminRes?.ok ? await adminRes.json().catch(() => []) : [];
        const publicPayload = publicRes?.ok ? await publicRes.json().catch(() => []) : [];
        const adminData = Array.isArray(adminPayload) ? adminPayload : Array.isArray(adminPayload?.items) ? adminPayload.items : [];
        const publicData = Array.isArray(publicPayload) ? publicPayload : Array.isArray(publicPayload?.items) ? publicPayload.items : [];
        const bySlug = new Map<string, Resort>();
        [...adminData, ...publicData].forEach((s: any) => {
          if (!s?.slug || bySlug.has(s.slug)) return;
          bySlug.set(s.slug, { id: s.id, slug: s.slug, name: s.name || s.slug, region: s.region, latitude: typeof s.latitude === "number" ? s.latitude : typeof s.lat === "number" ? s.lat : typeof s.location?.lat === "number" ? s.location.lat : null, longitude: typeof s.longitude === "number" ? s.longitude : typeof s.lon === "number" ? s.lon : typeof s.location?.lon === "number" ? s.location.lon : null });
        });
        if (!cancel) setStations(Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, "fr")));
      } catch { if (!cancel) setStations([]); }
      finally { if (!cancel) setLoadingStations(false); }
    }
    loadAllStations();
    return () => { cancel = true; };
  }, []);

  const filteredStations = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? stations.filter((station) => `${station.name} ${station.region?.name || ""}`.toLowerCase().includes(needle)) : stations;
  }, [q, stations]);

  useEffect(() => {
    async function loadWidget() {
      if (!selected?.slug) { setIframeUrl(null); return; }
      setLoadingWidget(true);
      try {
        const r = await fetch(`/api/ski/stations/${encodeURIComponent(selected.slug)}-widgets`);
        if (!r.ok) throw new Error("station_fetch_failed");
        const detail: StationWidgets = await r.json();
        setIframeUrl(detail?.meteo?.iframeUrl || detail?.meteo?.iframe_url || detail?.widgets?.meteo?.iframeUrl || detail?.widgets?.meteo?.iframe_url || null);
      } catch { setIframeUrl(null); }
      finally { setLoadingWidget(false); }
    }
    loadWidget();
  }, [selected]);

  return (
    <main className="weather-page">
      <section className="weather-page__hero"><div><p className="eyebrow">Météo montagne</p><h1>Météo des stations</h1><p>Consultez rapidement les conditions utiles pour préparer une sortie : température, neige, vent, visibilité et prévisions.</p></div><div className="notice notice--info"><strong>Conseil sortie</strong><span>Les données sont indicatives et peuvent évoluer rapidement en altitude.</span></div></section>
      <section className="weather-layout">
        <aside className="station-picker" aria-label="Choisir une station"><div className="section-heading"><div><p className="eyebrow">Recherche</p><h2>Choisir une station</h2></div><span>{filteredStations.length} résultat(s)</span></div><label className="field"><span>Station ou région</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. Auron, Chamonix, Alpes…" /></label>{loadingStations && <div className="skeleton-panel"><div /><div /><div /></div>}<div className="station-list" role="listbox">{filteredStations.map((station) => <button key={station.id || station.slug} type="button" onClick={() => setSelected(station)} className={selected?.slug === station.slug ? "is-selected" : ""}><strong>{station.name}</strong><span>{station.region?.name || "Station de ski"}</span></button>)}{!loadingStations && filteredStations.length === 0 && <div className="empty-state"><strong>Aucune station trouvée</strong><span>Essayez un nom plus court ou une région proche.</span></div>}</div></aside>
        <section className="weather-content">{!selected && <div className="empty-state empty-state--hero"><strong>Sélectionnez une station</strong><span>Le bulletin météo détaillé s’affichera ici avec les informations disponibles.</span></div>}{loadingWidget && <div className="skeleton-panel skeleton-panel--large"><div /><div /><div /></div>}{selected && !loadingWidget && iframeUrl && <div className="embedded-weather"><iframe src={iframeUrl} title={`Météo ${selected.name}`} loading="lazy" /></div>}{selected && !loadingWidget && !iframeUrl && selected.latitude != null && selected.longitude != null && <SkiWeatherWidget name={selected.name} lat={selected.latitude} lon={selected.longitude} />}{selected && !loadingWidget && !iframeUrl && !(selected.latitude != null && selected.longitude != null) && <div className="notice notice--warning"><strong>Météo indisponible</strong><span>Aucun widget météo ou coordonnées ne sont configurés pour {selected.name}.</span></div>}</section>
      </section>
    </main>
  );
}
