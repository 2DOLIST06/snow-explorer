import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  region?: { name?: string };
};

type WeatherPayload = {
  updatedAt?: string;
  current?: { temperature?: number | null; windspeed?: number | null; weathercode?: number | null };
  today?: { tmin?: number | null; tmax?: number | null; snowfall_cm?: number | null; snow_depth_cm?: number | null; precip_mm?: number | null; date?: string | null };
};

const n = (v: unknown, suffix = "") => (typeof v === "number" && Number.isFinite(v) ? `${v}${suffix}` : "—");

export default function MeteoPage() {
  const [q, setQ] = useState("");
  const [stations, setStations] = useState<Resort[]>([]);
  const [selected, setSelected] = useState<Resort | null>(null);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);

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
        const list = Array.isArray(data) ? data : [];
        const withCoords = list.filter((s: Resort) => typeof s?.latitude === "number" && typeof s?.longitude === "number");
        if (!cancel) setStations(withCoords);
      } catch {
        if (!cancel) setStations([]);
      } finally {
        if (!cancel) setLoadingStations(false);
      }
    }, 220);

    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    async function loadWeather() {
      if (!selected || typeof selected.latitude !== "number" || typeof selected.longitude !== "number") {
        setWeather(null);
        return;
      }
      setLoadingWeather(true);
      try {
        const url = `/api/ski-weather?lat=${selected.latitude}&lon=${selected.longitude}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("weather_failed");
        const data = await r.json();
        setWeather(data);
      } catch {
        setWeather(null);
      } finally {
        setLoadingWeather(false);
      }
    }
    loadWeather();
  }, [selected]);

  const title = useMemo(() => (selected ? `Météo — ${selected.name}` : "Météo des stations"), [selected]);

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px", display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>{title}</h1>
      <p style={{ margin: 0, color: "#475569" }}>Choisissez une station (active ou désactivée) pour afficher sa météo via ses coordonnées GPS.</p>

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
              style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", textAlign: "left", background: selected?.slug === station.slug ? "#eff6ff" : "#fff", cursor: "pointer" }}
            >
              <div style={{ fontWeight: 700 }}>{station.name} {station.is_active === false ? "(désactivée)" : ""}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>{station.region?.name || ""} · {station.latitude}, {station.longitude}</div>
            </button>
          ))}
          {!loadingStations && stations.length === 0 && <div style={{ color: "#64748b" }}>Aucune station avec coordonnées.</div>}
        </div>
      </section>

      <section style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "#fff", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Widget météo</h2>
        {!selected && <p style={{ color: "#64748b" }}>Sélectionnez une station pour afficher la météo.</p>}
        {loadingWeather && <p style={{ color: "#64748b" }}>Chargement météo…</p>}
        {selected && !loadingWeather && weather && (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 10 }}><strong>Température</strong><div>{n(weather.current?.temperature, "°C")}</div></div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 10 }}><strong>Vent</strong><div>{n(weather.current?.windspeed, " km/h")}</div></div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 10 }}><strong>Neige (jour)</strong><div>{n(weather.today?.snowfall_cm, " cm")}</div></div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 10 }}><strong>Hauteur neige</strong><div>{n(weather.today?.snow_depth_cm, " cm")}</div></div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 10 }}><strong>T min / max</strong><div>{n(weather.today?.tmin, "°C")} / {n(weather.today?.tmax, "°C")}</div></div>
          </div>
        )}
      </section>

      <Link href="/stations" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>← Retour aux stations</Link>
    </main>
  );
}
