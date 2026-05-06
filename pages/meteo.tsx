import React, { useEffect, useMemo, useState } from "react";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  region?: { name?: string };
};

type StationDetail = {
  widgets?: {
    meteo?: {
      enabled?: boolean;
      iframeUrl?: string | null;
      iframe_url?: string | null;
    };
  };
  meteo_iframe_url?: string | null;
  weather_iframe_url?: string | null;
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
    const t = setTimeout(async () => {
      setLoadingStations(true);
      try {
        const query = q.trim();
        const url = query ? `/api/ski/resorts/?q=${encodeURIComponent(query)}` : "/api/ski/resorts/";
        const r = await fetch(url);
        if (!r.ok) throw new Error("fetch_failed");
        const data = await r.json();
        if (!cancel) setStations(Array.isArray(data) ? data : []);
      } catch {
        if (!cancel) setStations([]);
      } finally {
        if (!cancel) setLoadingStations(false);
      }
    }, 200);

    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    async function loadWidget() {
      if (!selected?.slug) {
        setIframeUrl(null);
        return;
      }

      setLoadingWidget(true);
      try {
        const r = await fetch(`/api/ski/resorts/${encodeURIComponent(selected.slug)}`);
        if (!r.ok) throw new Error("station_fetch_failed");
        const detail: StationDetail = await r.json();

        const url =
          detail?.widgets?.meteo?.iframeUrl ||
          detail?.widgets?.meteo?.iframe_url ||
          detail?.meteo_iframe_url ||
          detail?.weather_iframe_url ||
          null;

        setIframeUrl(url);
      } catch {
        setIframeUrl(null);
      } finally {
        setLoadingWidget(false);
      }
    }

    loadWidget();
  }, [selected]);

  const title = useMemo(() => (selected ? `Météo — ${selected.name}` : "Météo des stations"), [selected]);

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px", display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>{title}</h1>
      <p style={{ margin: 0, color: "#475569" }}>
        Recherchez une station puis affichez son widget météo déjà configuré sur sa fiche.
      </p>

      <section style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "#fff", padding: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une station (nom, région...)"
          style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "11px 12px", marginBottom: 10 }}
        />

        {loadingStations && <div style={{ color: "#64748b", marginBottom: 8 }}>Chargement des stations…</div>}

        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
          {stations.map((station) => (
            <button
              key={station.id || station.slug}
              type="button"
              onClick={() => setSelected(station)}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 12px",
                textAlign: "left",
                background: selected?.slug === station.slug ? "#eff6ff" : "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700 }}>{station.name}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>{station.region?.name || ""}</div>
            </button>
          ))}
          {!loadingStations && stations.length === 0 && <div style={{ color: "#64748b" }}>Aucune station trouvée.</div>}
        </div>
      </section>

      <section style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "#fff", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Widget météo</h2>
        {!selected && <p style={{ color: "#64748b" }}>Sélectionnez une station pour afficher son widget météo.</p>}
        {loadingWidget && <p style={{ color: "#64748b" }}>Chargement du widget météo…</p>}

        {selected && !loadingWidget && iframeUrl && (
          <div style={{ aspectRatio: "16 / 10", width: "100%", overflow: "hidden", borderRadius: 12 }}>
            <iframe src={iframeUrl} title={`Météo ${selected.name}`} style={{ width: "100%", height: "100%", border: 0 }} loading="lazy" />
          </div>
        )}

        {selected && !loadingWidget && !iframeUrl && (
          <p style={{ color: "#64748b" }}>Aucun widget météo configuré pour cette station.</p>
        )}
      </section>
    </main>
  );
}
