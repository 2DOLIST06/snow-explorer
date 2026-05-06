import React, { useEffect, useMemo, useState } from "react";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  region?: { name?: string };
};

type StationWidgets = {
  meteo?: {
    enabled?: boolean;
    iframeUrl?: string | null;
    iframe_url?: string | null;
  };
};

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
        const [adminRes, publicRes] = await Promise.all([
          fetch("/api/ski/stations").catch(() => null),
          fetch("/api/ski/resorts/").catch(() => null),
        ]);

        const adminPayload = adminRes?.ok ? await adminRes.json().catch(() => []) : [];
        const publicPayload = publicRes?.ok ? await publicRes.json().catch(() => []) : [];

        const adminData = Array.isArray(adminPayload) ? adminPayload : Array.isArray(adminPayload?.items) ? adminPayload.items : [];
        const publicData = Array.isArray(publicPayload) ? publicPayload : Array.isArray(publicPayload?.items) ? publicPayload.items : [];

        const merged = [...adminData, ...publicData];

        const bySlug = new Map<string, Resort>();
        merged.forEach((s: any) => {
          if (!s?.slug) return;
          if (!bySlug.has(s.slug)) {
            bySlug.set(s.slug, {
              id: s.id,
              slug: s.slug,
              name: s.name || s.slug,
              region: s.region,
            });
          }
        });

        const list = Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
        if (!cancel) setStations(list);
      } catch {
        if (!cancel) setStations([]);
      } finally {
        if (!cancel) setLoadingStations(false);
      }
    }

    loadAllStations();

    return () => {
      cancel = true;
    };
  }, []);

  const filteredStations = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return stations;
    return stations.filter((station) => `${station.name} ${station.region?.name || ""}`.toLowerCase().includes(needle));
  }, [q, stations]);

  useEffect(() => {
    async function loadWidget() {
      if (!selected?.slug) {
        setIframeUrl(null);
        return;
      }

      setLoadingWidget(true);
      try {
        const r = await fetch(`/api/ski/stations/${encodeURIComponent(selected.slug)}-widgets`);
        if (!r.ok) throw new Error("station_fetch_failed");
        const detail: StationWidgets = await r.json();
        const url = detail?.meteo?.iframeUrl || detail?.meteo?.iframe_url || null;
        setIframeUrl(url);
      } catch {
        setIframeUrl(null);
      } finally {
        setLoadingWidget(false);
      }
    }

    loadWidget();
  }, [selected]);

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px", display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>Météo des stations</h1>
      <p style={{ margin: 0, color: "#475569" }}>Dépliez la liste de toutes les stations (actives et inactives), puis filtrez en tapant un nom.</p>

      <section style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "#fff", padding: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer les stations..."
          style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "11px 12px", marginBottom: 10 }}
        />

        {loadingStations && <div style={{ color: "#64748b", marginBottom: 8 }}>Chargement des stations…</div>}

        <details open style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, marginBottom: 8 }}>Liste des stations ({filteredStations.length})</summary>
          <div style={{ display: "grid", gap: 8, maxHeight: 340, overflow: "auto" }}>
            {filteredStations.map((station) => (
              <button
                key={station.id || station.slug}
                type="button"
                onClick={() => setSelected(station)}
                style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", textAlign: "left", background: selected?.slug === station.slug ? "#eff6ff" : "#fff", cursor: "pointer" }}
              >
                <div style={{ fontWeight: 700 }}>{station.name}</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>{station.region?.name || ""}</div>
              </button>
            ))}
            {!loadingStations && filteredStations.length === 0 && <div style={{ color: "#64748b" }}>Aucune station trouvée.</div>}
          </div>
        </details>
      </section>

      <section style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "#fff", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Widget météo</h2>
        {!selected && <p style={{ color: "#64748b" }}>Sélectionnez une station pour afficher son widget météo.</p>}
        {loadingWidget && <p style={{ color: "#64748b" }}>Chargement du widget météo…</p>}
        {selected && !loadingWidget && iframeUrl && <div style={{ aspectRatio: "16 / 10", width: "100%", overflow: "hidden", borderRadius: 12 }}><iframe src={iframeUrl} title={`Météo ${selected.name}`} style={{ width: "100%", height: "100%", border: 0 }} loading="lazy" /></div>}
        {selected && !loadingWidget && !iframeUrl && <p style={{ color: "#64748b" }}>Aucun widget météo configuré pour cette station.</p>}
      </section>
    </main>
  );
}
